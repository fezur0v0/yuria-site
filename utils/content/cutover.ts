import 'server-only';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getR2Config } from '@/utils/r2/server';
import { privateBucketName } from '@/utils/migration/backup';
import { decodeCutoverState, initialCutoverState, type CutoverState } from '@/utils/migration/cutover';

const stateKey = 'content/cutover.json';
export function cutoverR2() {
  return { client: createR2Client(), bucket: privateBucketName(process.env.R2_PRIVATE_BUCKET_NAME, getR2Config().bucket) };
}
export function missingKey(error: unknown) {
  return !!error && typeof error === 'object' && ('name' in error && error.name === 'NoSuchKey' ||
    '$metadata' in error && (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404);
}
export async function readCutover() {
  if (!process.env.R2_PRIVATE_BUCKET_NAME) {
    if (process.env.CONTENT_BACKEND === 'r2') throw new Error('缺少私有桶配置');
    return { state: initialCutoverState, etag: undefined as string | undefined };
  }
  const { client, bucket } = cutoverR2();
  try {
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: stateKey }));
    if (!object.Body || !object.ETag || (object.ContentLength ?? 0) > 16 * 1024) throw new Error('迁移状态不可读取');
    return { state: decodeCutoverState(await object.Body.transformToByteArray()), etag: object.ETag };
  } catch (error) {
    if (!missingKey(error)) throw error;
    return { state: initialCutoverState, etag: undefined as string | undefined };
  }
}
export async function writeCutover(state: CutoverState, etag?: string) {
  const { client, bucket } = cutoverR2();
  const result = await client.send(new PutObjectCommand({ Bucket: bucket, Key: stateKey,
    Body: JSON.stringify(state), ContentType: 'application/json', CacheControl: 'private, no-store',
    ...(etag ? { IfMatch: etag } : { IfNoneMatch: '*' }) }));
  if (!result.ETag) throw new Error('迁移状态写入结果未知，请刷新检查');
  return result.ETag;
}
