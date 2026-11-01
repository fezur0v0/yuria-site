import { GetObjectCommand } from '@aws-sdk/client-s3';
import { contentContext } from '@/utils/content/request';
import { createR2Client, getR2Config } from '@/utils/r2/server';
import { cropSourceKey } from '@/utils/me-crop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: Request) {
  const access = await contentContext();
  if (!access.owner) return Response.json({ error: '没有编辑权限' }, { status: 403, headers });
  try {
    const { bucket, publicUrl } = getR2Config();
    const key = cropSourceKey(new URL(request.url).searchParams.get('url') ?? '', publicUrl);
    if (!key) return Response.json({ error: '请上传图片后裁剪' }, { status: 400, headers });
    const object = await createR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!object.Body || !/^image\/(jpeg|png|webp|avif)$/.test(object.ContentType ?? '') || !object.ContentLength || object.ContentLength > 20 * 1024 * 1024) return Response.json({ error: '图片格式或大小不支持裁剪' }, { status: 400, headers });
    return new Response(object.Body.transformToWebStream(), { headers: { ...headers, 'Content-Type': object.ContentType!, 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch { return Response.json({ error: '图片读取未完成，请上传原图后重试' }, { status: 503, headers }); }
}
