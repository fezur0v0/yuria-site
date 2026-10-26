import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { contentContext } from '@/utils/content/request';
import { contentR2, missingObject } from '@/utils/content/store';
import { isSameOriginRequest } from '@/utils/security/origin';
import { previewMatches } from '@/utils/migration/preview';
import { isValidTheaterObjectPath } from '@/utils/notes/media';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const rasterImageType = /^image\/(?:jpeg|png|gif|webp|avif|bmp|tiff|heic|heif|x-icon)$/i;

export async function GET(request: Request) {
  const access = await contentContext();
  if (!access.owner) {
    return Response.json({ error: '没有访问权限' }, { status: 403, headers: privateHeaders });
  }

  const path = new URL(request.url).searchParams.get('path') ?? '';
  if (!isValidTheaterObjectPath(path)) {
    return Response.json({ error: '图片地址无效' }, { status: 400, headers: privateHeaders });
  }

  if (access.r2) {
    const { client, bucket } = contentR2();
    const keys = [`content/${access.preview ? 'preview' : 'live'}/media/${path}`];
    const prefix = process.env.R2_CONTENT_BACKUP_PREFIX;
    if (prefix && /^migration-backups\/[a-zA-Z0-9_-]+$/.test(prefix)) keys.push(`${prefix}/storage/theater-images/${path}`);
    for (const key of keys) {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!object.Body || !rasterImageType.test(object.ContentType ?? '')) {
          return Response.json({ error: '不支持的图片格式' }, { status: 415, headers: privateHeaders });
        }
        return new Response(object.Body.transformToWebStream(), { headers: { ...privateHeaders,
          'Content-Type': object.ContentType!, 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        } });
      } catch (error) {
        if (!missingObject(error)) return Response.json({ error: 'R2 图片暂时无法读取' }, { status: 503, headers: privateHeaders });
      }
    }
    return Response.json({ error: '图片不存在' }, { status: 404, headers: privateHeaders });
  }
  const { data, error } = await access.supabase.storage.from('theater-images').download(path);
  if (error || !data) {
    return Response.json({ error: '图片暂时无法读取' }, { status: 404, headers: privateHeaders });
  }
  if (!rasterImageType.test(data.type)) {
    return Response.json({ error: '不支持的图片格式' }, { status: 415, headers: privateHeaders });
  }

  return new Response(data.stream(), {
    headers: {
      ...privateHeaders,
      'Content-Type': data.type,
      'Content-Length': String(data.size),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: '请求来源无效' }, { status: 403, headers: privateHeaders });
  const access = await contentContext();
  if (!previewMatches(request.headers.get('x-yuria-preview'), access.preview)) {
    return Response.json({ error: '预览已结束，请刷新页面后继续' }, { status: 409, headers: privateHeaders });
  }
  if (!access.owner) return Response.json({ error: '没有上传权限' }, { status: 403, headers: privateHeaders });
  const path = new URL(request.url).searchParams.get('path') ?? '';
  const type = request.headers.get('content-type') ?? '';
  if (!isValidTheaterObjectPath(path) || !rasterImageType.test(type)) {
    return Response.json({ error: '图片格式或路径无效' }, { status: 400, headers: privateHeaders });
  }
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: '图片为空' }, { status: 400, headers: privateHeaders });
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 4 * 1024 * 1024) {
      await reader.cancel();
      return Response.json({ error: '私人图片请控制在 4 MB 以内，压缩后重试' }, { status: 413, headers: privateHeaders });
    }
    chunks.push(part.value);
  }
  if (!size) return Response.json({ error: '图片为空' }, { status: 400, headers: privateHeaders });
  const bytes = Buffer.concat(chunks);
  try {
    if (access.r2) {
      const { client, bucket } = contentR2();
      await client.send(new PutObjectCommand({ Bucket: bucket,
        Key: `content/${access.preview ? 'preview' : 'live'}/media/${path}`,
        Body: bytes, ContentType: type, CacheControl: 'private, no-store', IfNoneMatch: '*' }));
    } else {
      const { error } = await access.supabase.storage.from('theater-images').upload(path, bytes, { contentType: type });
      if (error) throw error;
    }
    return Response.json({ uploaded: true }, { headers: privateHeaders });
  } catch { return Response.json({ error: '图片上传未完成，请重试' }, { status: 503, headers: privateHeaders }); }
}
