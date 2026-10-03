import { S3Client } from '@aws-sdk/client-s3';

const requiredEnvironmentVariables = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const;

export function getR2Config() {
  const missing = requiredEnvironmentVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`缺少 R2 环境变量：${missing.join(', ')}`);
  }

  return {
    bucket: process.env.R2_BUCKET_NAME!,
    publicUrl: process.env.R2_PUBLIC_URL!.replace(/\/$/, ''),
  };
}

export function createR2Client() {
  getR2Config();

  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
