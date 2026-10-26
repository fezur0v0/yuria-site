import 'server-only';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getR2Config } from '@/utils/r2/server';
import { privateBucketName, CONTENT_TABLES } from '@/utils/migration/backup';
import { decodeContent, verifyBackupBytes } from '@/utils/migration/content';

export async function readVerifiedContentBackup() {
  const prefix = process.env.R2_CONTENT_BACKUP_PREFIX;
  if (!prefix || !/^migration-backups\/[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error('未配置内容备份目录');
  const bucket = privateBucketName(process.env.R2_PRIVATE_BUCKET_NAME, getR2Config().bucket);
  const client = createR2Client();
  async function read(key: string) {
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!object.Body || (object.ContentLength ?? 0) > 32 * 1024 * 1024) throw new Error('备份文件不可读取或超过预览限制');
    return object.Body.transformToByteArray();
  }
  const manifest = JSON.parse(new TextDecoder().decode(await read(`${prefix}/manifest.json`)));
  if (manifest?.version !== 1 || manifest.database?.key !== `${prefix}/database.json` ||
      typeof manifest.database.sha256 !== 'string' || !Number.isSafeInteger(manifest.database.bytes)) {
    throw new Error('备份完成标记无效');
  }
  const bytes = await read(manifest.database.key);
  verifyBackupBytes(bytes, manifest.database);
  const document = decodeContent(bytes);
  for (const name of CONTENT_TABLES) {
    if (manifest.counts?.[name] !== document.tables[name].length) throw new Error('备份记录数量不一致');
  }
  return { document, prefix };
}
