import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isOwnerRequest } from '@/utils/auth/isOwner';
import { createR2Client, getR2Config } from '@/utils/r2/server';

export const runtime = 'nodejs';

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_FOLDER = /^(gallery\/[a-zA-Z0-9-]+|portfolio\/(covers|content))$/;

function encodeObjectKey(key: string) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function safeFileName(fileName: string) {
  const normalized = fileName
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.');
  return normalized.slice(-120) || 'upload';
}

export async function POST(request: Request) {
  if (!await isOwnerRequest()) {
    return Response.json({ error: '没有上传权限' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    fileName?: string;
    contentType?: string;
    size?: number;
    folder?: string;
  } | null;

  if (!body?.fileName || !body.contentType || !body.folder || typeof body.size !== 'number') {
    return Response.json({ error: '缺少文件信息' }, { status: 400 });
  }
  if (!body.contentType.startsWith('image/') && !body.contentType.startsWith('video/')) {
    return Response.json({ error: '只支持图片和视频' }, { status: 400 });
  }
  if (body.size <= 0 || body.size > MAX_UPLOAD_SIZE) {
    return Response.json({ error: '文件大小必须在 2 GB 以内' }, { status: 400 });
  }
  if (!ALLOWED_FOLDER.test(body.folder)) {
    return Response.json({ error: '上传目录无效' }, { status: 400 });
  }

  const { bucket, publicUrl } = getR2Config();
  const key = `${body.folder}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(body.fileName)}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: body.contentType,
  });
  const uploadUrl = await getSignedUrl(createR2Client(), command, { expiresIn: 10 * 60 });

  return Response.json({
    uploadUrl,
    publicUrl: `${publicUrl}/${encodeObjectKey(key)}`,
  });
}

export async function DELETE(request: Request) {
  if (!await isOwnerRequest()) {
    return Response.json({ error: '没有删除权限' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { url?: string } | null;
  if (!body?.url) {
    return Response.json({ error: '缺少文件地址' }, { status: 400 });
  }

  const { bucket, publicUrl } = getR2Config();
  const prefix = `${publicUrl}/`;
  if (!body.url.startsWith(prefix)) {
    return Response.json({ deleted: false });
  }

  const key = decodeURIComponent(body.url.slice(prefix.length));
  if (!key || key.includes('..')) {
    return Response.json({ error: '文件地址无效' }, { status: 400 });
  }

  await createR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return Response.json({ deleted: true });
}
