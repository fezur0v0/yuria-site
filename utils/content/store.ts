import 'server-only';
import { createHash } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getR2Config } from '@/utils/r2/server';
import { privateBucketName } from '@/utils/migration/backup';
import { decodeContent, type ContentDocument } from '@/utils/migration/content';
import { readVerifiedContentBackup } from '@/utils/migration/readBackup';

export const tableVersion = (rows: unknown[]) => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
export function contentR2() {
  return { client: createR2Client(), bucket: privateBucketName(process.env.R2_PRIVATE_BUCKET_NAME, getR2Config().bucket) };
}
export function missingObject(error: unknown) {
  return !!error && typeof error === 'object' && ('name' in error && error.name === 'NoSuchKey' ||
    '$metadata' in error && (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404);
}
export function conflict(error: unknown) {
  return !!error && typeof error === 'object' && '$metadata' in error &&
    (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 412;
}
export async function readContent(preview: boolean) {
  const { client, bucket } = contentR2();
  const key = preview ? 'content/preview/current.json' : 'content/live/current.json';
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body || (response.ContentLength ?? 0) > 32 * 1024 * 1024) throw new Error('内容文件不可读取');
    return { document: decodeContent(await response.Body.transformToByteArray()), etag: response.ETag, key };
  } catch (error) {
    if (!missingObject(error)) throw error;
    const { document } = await readVerifiedContentBackup();
    return { document, etag: undefined, key };
  }
}
export async function saveContent(current: Awaited<ReturnType<typeof readContent>>, document: ContentDocument) {
  const { client, bucket } = contentR2();
  const bytes = new TextEncoder().encode(JSON.stringify(document));
  decodeContent(bytes);
  if (bytes.length > 32 * 1024 * 1024) throw new Error('内容超过当前文件存储限制');
  // Preserve the previous complete state before attempting an atomic replacement.
  await client.send(new PutObjectCommand({ Bucket: bucket,
    Key: `${current.key.replace('/current.json', '/history')}/${Date.now()}_${crypto.randomUUID()}.json`,
    Body: JSON.stringify(current.document), ContentType: 'application/json', CacheControl: 'private, no-store', IfNoneMatch: '*' }));
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: current.key, Body: bytes,
      ContentType: 'application/json', CacheControl: 'private, no-store',
      ...(current.etag ? { IfMatch: current.etag } : { IfNoneMatch: '*' }) }));
    return true;
  } catch (error) { if (conflict(error)) return false; throw error; }
}
