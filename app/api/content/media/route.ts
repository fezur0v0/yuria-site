import { GetObjectCommand } from '@aws-sdk/client-s3';
import { contentContext } from '@/utils/content/request';
import { contentR2, missingObject, readContent } from '@/utils/content/store';
import { backupObjectKey, MEDIA_BUCKETS } from '@/utils/migration/backup';
import { visibleContent } from '@/utils/migration/content';
import { legacyMediaReferences } from '@/utils/migration/legacyMedia';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const mediaType = /^(image\/(jpeg|png|gif|webp|avif|bmp|tiff|heic|heif|x-icon)|video\/(mp4|webm|ogg|quicktime))$/i;

export async function GET(request: Request) {
  try {
    const access = await contentContext();
    if (access.state.phase !== 'active' || access.preview) return Response.json({ error: '图片不存在' }, { status: 404, headers });
    const params = new URL(request.url).searchParams;
    const bucket = params.get('bucket') ?? '';
    const path = params.get('path') ?? '';
    if (!(MEDIA_BUCKETS as readonly string[]).includes(bucket) || path.length > 1024) return Response.json({ error: '图片地址无效' }, { status: 400, headers });
    const key = backupObjectKey(access.state.prefix, bucket, path);
    if (!access.owner) {
      const { document } = await readContent(false, access.state);
      const refs = legacyMediaReferences(visibleContent(document, false), process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (!refs.some(media => media.bucket === bucket && media.path === path)) {
        return Response.json({ error: '图片不存在' }, { status: 404, headers });
      }
    }
    const target = contentR2();
    const object = await target.client.send(new GetObjectCommand({ Bucket: target.bucket, Key: key }));
    if (!object.Body || !mediaType.test(object.ContentType ?? '')) return Response.json({ error: '不支持的媒体格式' }, { status: 415, headers });
    return new Response(object.Body.transformToWebStream(), { headers: { ...headers, 'Content-Type': object.ContentType!,
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch (error) {
    return Response.json({ error: '媒体暂时不可读取' }, { status: missingObject(error) ? 404 : 503, headers });
  }
}
