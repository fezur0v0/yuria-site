import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { contentContext } from '@/utils/content/request';
import { contentR2, conflict, missingObject, readContent } from '@/utils/content/store';
import { readCutover } from '@/utils/content/cutover';
import { isSameOriginRequest } from '@/utils/security/origin';
import { supabaseBackupSource } from '@/utils/migration/source';
import { verifyCleanup } from '@/utils/migration/cleanup';
import { CONTENT_TABLES } from '@/utils/migration/backup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });

export async function GET() {
  const access = await contentContext();
  if (!access.owner) return reply({ error: '仅站长可访问' }, 403);
  if (access.state.phase !== 'active') return reply({ error: '请先完成正式 R2 切换' }, 409);
  try {
    const source = supabaseBackupSource(access.supabase);
    let rows = 0;
    for (const table of CONTENT_TABLES) rows += (await source.table(table)).length;
    const { data: passwords, error } = await access.supabase.from('access_config').select('key');
    if (error) throw error;
    const files = (await source.files()).length;
    return reply({ rows, files, passwords: passwords?.length ?? 0, complete: rows === 0 && files === 0 && !passwords?.length });
  } catch { return reply({ error: '无法读取待清理清单，请刷新后重试' }, 503); }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return reply({ error: '请求来源无效' }, 403);
  const access = await contentContext();
  if (!access.owner) return reply({ error: '仅站长可操作' }, 403);
  if (access.state.phase !== 'active') return reply({ error: '请先完成正式 R2 切换' }, 409);
  if ((await request.json().catch(() => null))?.action !== 'cleanup') return reply({ error: '操作无效' }, 400);
  const { client, bucket } = contentR2();
  const key = `cleanup/supabase/${access.state.run}/state.json`;
  let lease: string | undefined;
  let filesDeleted = 0;
  const writeState = async (phase: string, detail: Record<string, unknown> = {}) => {
    const result = await client.send(new PutObjectCommand({ Bucket: bucket, Key: key,
      Body: JSON.stringify({ phase, startedAt: new Date().toISOString(), ...detail }),
      ContentType: 'application/json', CacheControl: 'private, no-store',
      ...(lease ? { IfMatch: lease } : { IfNoneMatch: '*' }) }));
    if (!result.ETag) throw new Error('清理状态写入未确认');
    lease = result.ETag;
  };
  try {
    try {
      const prior = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!prior.Body || !prior.ETag) throw new Error('无法读取清理状态');
      const state = JSON.parse(await prior.Body.transformToString());
      if (state.phase === 'running' && Date.now() - Date.parse(state.startedAt) < 360_000) {
        return reply({ error: '已有清理正在运行，请稍后刷新；连接中断后请等待六分钟再重试' }, 409);
      }
      lease = prior.ETag;
    } catch (error) { if (!missingObject(error)) throw error; }
    await writeState('running');
    await readContent(false, access.state); // Confirm the current live document is still readable.
    const source = supabaseBackupSource(access.supabase);
    const plan = await verifyCleanup(source, async objectKey => {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
      if (!object.Body || (object.ContentLength ?? 0) > 64 * 1024 * 1024) throw new Error('R2 备份不可读取');
      return object.Body.transformToByteArray();
    }, access.state.prefix);
    const { data: passwords, error } = await access.supabase.from('access_config').select('key');
    if (error) throw new Error('旧密码配置清单读取失败');
    if (plan.rows > 88 || plan.files.length > 21 || (passwords?.length ?? 0) > 2) throw new Error('待删除数量超出已确认范围，清理已停止');
    const latest = await readCutover();
    if (latest.state.phase !== 'active' || latest.state.run !== access.state.run) throw new Error('正式内容来源已变化，清理已停止');
    // The original full backup remains intact. This records the exact remaining source rows for retries.
    const snapshotKey = `cleanup/supabase/${access.state.run}/${Date.now()}_${crypto.randomUUID()}.json`;
    const snapshot = new TextEncoder().encode(JSON.stringify({ version: 1, tables: plan.tables, files: plan.files }));
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: snapshotKey, Body: snapshot,
      ContentType: 'application/json', CacheControl: 'private, no-store', IfNoneMatch: '*' }));
    const saved = await client.send(new GetObjectCommand({ Bucket: bucket, Key: snapshotKey }));
    if (!saved.Body || !Buffer.from(await saved.Body.transformToByteArray()).equals(Buffer.from(snapshot))) throw new Error('清理前快照校验失败');
    for (const file of plan.files) {
      const { error: removeError } = await access.supabase.storage.from(file.bucket).remove([file.path]);
      if (removeError) throw new Error('部分原图片尚未删除，可以稍后重试；R2 副本保留');
      filesDeleted++;
    }
    if ((await source.files()).length) throw new Error('Supabase 仍有图片，旧内容暂未清空，请重试检查');
    // One invoker transaction locks and compares every source row, then deletes children before parents.
    const result = await access.supabase.rpc('cleanup_legacy_content', {
      expected: plan.tables, access_keys: (passwords ?? []).map(row => row.key),
    });
    if (result.error) throw new Error('旧内容事务未完成，内容可能有变动或登录权限不足；请刷新后重试');
    await writeState('complete', { rowsDeleted: plan.rows, filesDeleted, passwordsDeleted: passwords?.length ?? 0 });
    return reply({ complete: true, rowsDeleted: plan.rows, filesDeleted, passwordsDeleted: passwords?.length ?? 0 });
  } catch (error) {
    if (lease) { try { await writeState('retry', { filesDeleted }); } catch { /* Expiring lease makes a later retry safe. */ } }
    const message = error instanceof Error && /备份|清理|图片|旧内容|旧密码|数量|来源|Supabase/.test(error.message)
      ? error.message : '清理未确认完成，请刷新检查剩余数量；R2 内容及备份保留';
    return reply({ error: message, filesDeleted }, conflict(error) ? 409 : 503);
  }
}
