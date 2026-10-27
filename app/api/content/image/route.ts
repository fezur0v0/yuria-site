import { GetObjectCommand } from '@aws-sdk/client-s3';
import { contentContext } from '@/utils/content/request';
import { contentR2, missingObject, readContent } from '@/utils/content/store';
import { visibleContent } from '@/utils/migration/content';
import { imageReferences } from '@/utils/migration/images';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
export async function GET(request: Request) {
  const access = await contentContext();
  const file = new URL(request.url).searchParams.get('key') ?? '';
  if (!/^[a-f0-9]{64}\.(jpg|png|gif|webp|avif|bmp)$/.test(file)) return Response.json({ error: '图片地址无效' }, { status: 400, headers });
  try {
    if (!access.owner) {
      if (access.state.phase !== 'active') return Response.json({ error: '没有访问权限' }, { status: 403, headers });
      const { document } = await readContent(false, access.state);
      const published = imageReferences(visibleContent(document, false)).some(source => {
        try { const url = new URL(source.replaceAll('&amp;', '&'), 'https://www.yuria.xin');
          return url.origin === 'https://www.yuria.xin' && url.pathname === '/api/content/image' && url.searchParams.get('key') === file;
        } catch { return false; }
      });
      if (!published) return Response.json({ error: '没有访问权限' }, { status: 403, headers });
    }
    const { client, bucket } = contentR2();
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `content/live/imported/${file}` }));
    if (!object.Body || !/^image\/(jpeg|png|gif|webp|avif|bmp)$/.test(object.ContentType ?? '')) throw new Error('invalid media');
    return new Response(object.Body.transformToWebStream(), { headers: { ...headers, 'Content-Type': object.ContentType!,
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch (error) { return Response.json({ error: '图片暂时不可读取' }, { status: missingObject(error) ? 404 : 503, headers }); }
}
