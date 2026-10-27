import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isOwnerUser } from '@/utils/auth/owner';
import { isSameOriginRequest } from '@/utils/security/origin';
import { cutoverR2, readCutover, writeCutover } from '@/utils/content/cutover';
import { initialCutoverState, runFreshCutover } from '@/utils/migration/cutover';
import { supabaseBackupSource } from '@/utils/migration/source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
async function ownerContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return !error && isOwnerUser(user) ? supabase : null;
}
export async function GET() {
  if (!await ownerContext()) return reply({ error: '仅站长可访问' }, 403);
  try {
    const { state } = await readCutover();
    return reply({ state, recoverable: state.phase === 'preparing' && Date.now() - Date.parse(state.startedAt) > 360_000 });
  } catch { return reply({ error: '无法读取迁移状态，请稍后重试' }, 503); }
}
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return reply({ error: '请求来源无效' }, 403);
  const supabase = await ownerContext();
  if (!supabase) return reply({ error: '仅站长可操作' }, 403);
  const body = await request.json().catch(() => null);
  if (!['activate-fresh', 'recover'].includes(body?.action)) return reply({ error: '操作无效' }, 400);
  try {
    const current = await readCutover();
    if (current.state.phase === 'active') return reply({ complete: true, state: current.state });
    if (body.action === 'recover') {
      if (current.state.phase !== 'preparing' || Date.now() - Date.parse(current.state.startedAt) <= 360_000) {
        return reply({ error: '迁移仍可能在运行，暂时不能解除暂停' }, 409);
      }
      await writeCutover(initialCutoverState, current.etag);
      return reply({ state: initialCutoverState });
    }
    if (current.state.phase !== 'idle') return reply({ error: '已有迁移正在进行，请稍后刷新状态' }, 409);
    const run = `${Date.now()}_${crypto.randomUUID()}`;
    const { client, bucket } = cutoverR2();
    let lease: string | undefined;
    const state = await runFreshCutover(supabaseBackupSource(supabase), {
      async put(key, bytes, type) {
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes,
          ContentType: type, CacheControl: 'private, no-store', IfNoneMatch: '*' }));
      },
      async get(key) {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!object.Body || (object.ContentLength ?? 0) > 64 * 1024 * 1024) throw new Error('R2 副本不可读取');
        return object.Body.transformToByteArray();
      },
    }, {
      async acquire() {
        lease = await writeCutover({ version: 1, phase: 'preparing', run, startedAt: new Date().toISOString() }, current.etag);
        // Let already-started requests settle; the final re-read also detects source drift.
        await new Promise(resolve => setTimeout(resolve, 2000));
      },
      async activate(active) { await writeCutover(active, lease); },
      async abort() {
        const latest = await readCutover();
        if (latest.state.phase === 'preparing' && latest.state.run === run) await writeCutover(initialCutoverState, latest.etag);
      },
    }, run, process.env.NEXT_PUBLIC_SUPABASE_URL);
    const response = reply({ complete: true, state });
    response.cookies.set('yuria-r2-preview', '', { path: '/', httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production', maxAge: 0 });
    return response;
  } catch (error) {
    console.error('R2 cutover did not finish:', error instanceof Error ? error.name : 'unknown');
    // Reconcile an uncertain final PUT before reporting failure; never roll back an active store.
    try {
      const latest = await readCutover();
      if (latest.state.phase === 'active') return reply({ complete: true, state: latest.state });
    } catch { /* An unknown state stays paused instead of guessing a write destination. */ }
    return reply({ error: '本次切换未确认完成。请刷新迁移状态；原数据与测试副本均保留，未完成时仍使用原网站内容。' }, 503);
  }
}
