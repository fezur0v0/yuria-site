import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/utils/supabase/server';
import { isOwnerUser } from '@/utils/auth/owner';
import { isSameOriginRequest } from '@/utils/security/origin';
import { createR2Client, getR2Config } from '@/utils/r2/server';
import { CONTENT_TABLES, MEDIA_BUCKETS, createVerifiedBackup, privateBucketName } from '@/utils/migration/backup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });

async function ownerContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return !error && isOwnerUser(user) ? supabase : null;
}

function destination() {
  const { bucket: publicBucket } = getR2Config();
  return { client: createR2Client(), bucket: privateBucketName(process.env.R2_PRIVATE_BUCKET_NAME, publicBucket) };
}

export async function GET() {
  if (!await ownerContext()) return reply({ error: '仅站长可访问' }, 403);
  try {
    const { client, bucket } = destination();
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    return reply({ ready: true, bucket, tables: CONTENT_TABLES, mediaBuckets: MEDIA_BUCKETS });
  } catch {
    return reply({ error: '私有桶连接检查失败，请确认 R2_PRIVATE_BUCKET_NAME 和凭证的桶权限' }, 503);
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return reply({ error: '请求来源无效' }, 403);
  const supabase = await ownerContext();
  if (!supabase) return reply({ error: '仅站长可操作' }, 403);
  const body = await request.json().catch(() => null);
  if (body?.action !== 'backup') return reply({ error: '操作无效' }, 400);
  const prefix = `migration-backups/${Date.now()}_${crypto.randomUUID()}`;
  try {
    const { client, bucket } = destination();
    const result = await createVerifiedBackup({
      async table(name) {
        const rows = [];
        const primaryKey = name === 'site_config' ? 'key' : 'id';
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase.from(name).select('*').order(primaryKey).range(offset, offset + 999);
          if (error) throw new Error('读取业务表失败');
          rows.push(...(data ?? []));
          if (!data || data.length < 1000) return rows;
        }
      },
      async files() {
        const files: { bucket: string; path: string }[] = [];
        for (const sourceBucket of MEDIA_BUCKETS) {
          const folders = [''];
          while (folders.length) {
            const folder = folders.pop()!;
            for (let offset = 0; ; offset += 1000) {
              const { data, error } = await supabase.storage.from(sourceBucket).list(folder, {
                limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
              });
              if (error) throw new Error('读取图片列表失败');
              for (const item of data ?? []) {
                const path = folder ? `${folder}/${item.name}` : item.name;
                if (item.id) files.push({ bucket: sourceBucket, path });
                else folders.push(path);
              }
              if (!data || data.length < 1000) break;
            }
          }
        }
        return files;
      },
      async download(file) {
        const { data, error } = await supabase.storage.from(file.bucket).download(file.path);
        if (error || !data) throw new Error('读取原图片失败');
        if (data.size > 64 * 1024 * 1024) throw new Error('存在超过 64 MB 的文件，需要分批流式迁移');
        return { bytes: new Uint8Array(await data.arrayBuffer()), type: data.type || 'application/octet-stream' };
      },
    }, {
      async put(key, bytes, type) {
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes,
          ContentType: type, CacheControl: 'private, no-store', IfNoneMatch: '*' }));
      },
      async get(key) {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!object.Body) throw new Error('读取 R2 副本失败');
        return object.Body.transformToByteArray();
      },
    }, prefix);
    return reply({ complete: true, ...result });
  } catch {
    return reply({ error: '备份未完成，原数据和网站来源均未改动。可重试；未完成的目录不作为有效备份。', prefix }, 500);
  }
}
