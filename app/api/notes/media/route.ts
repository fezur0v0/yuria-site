import { isOwnerRequest } from '@/utils/auth/isOwner';
import { createClient } from '@/utils/supabase/server';
import { isValidTheaterObjectPath } from '@/utils/notes/media';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const rasterImageType = /^image\/(?:jpeg|png|gif|webp|avif|bmp|tiff|heic|heif|x-icon)$/i;

export async function GET(request: Request) {
  if (!await isOwnerRequest()) {
    return Response.json({ error: '没有访问权限' }, { status: 403, headers: privateHeaders });
  }

  const path = new URL(request.url).searchParams.get('path') ?? '';
  if (!isValidTheaterObjectPath(path)) {
    return Response.json({ error: '图片地址无效' }, { status: 400, headers: privateHeaders });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('theater-images').download(path);
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
