import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { contentContext } from '@/utils/content/request';
import { contentR2, conflict, readContent, saveContent } from '@/utils/content/store';
import { getR2Config, createR2Client } from '@/utils/r2/server';
import { isSameOriginRequest } from '@/utils/security/origin';
import { detectedImageType, imageDigest, planImages, rewriteImageUrls } from '@/utils/migration/images';
import { downloadImage } from '@/utils/migration/downloadImage';
import assets from '@/generated/site-assets.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
function plan(document: Parameters<typeof planImages>[0]) {
  return planImages(document, { siteOrigin: 'https://www.yuria.xin', publicR2: getR2Config().publicUrl,
    projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    assets: Object.fromEntries(Object.entries(assets.files).map(([source, file]) => [source, `${assets.baseUrl}/${file.key.split('/').map(encodeURIComponent).join('/')}`])) });
}
export async function GET() {
  const access = await contentContext();
  if (!access.owner) return reply({ error: '仅站长可访问' }, 403);
  if (access.state.phase !== 'active') return reply({ error: '请先完成正式 R2 切换' }, 409);
  const current = await readContent(false, access.state);
  const jobs = plan(current.document);
  return reply({ remaining: jobs.length, public: jobs.filter(job => job.public).length,
    private: jobs.filter(job => !job.public).length, hosts: [...new Set(jobs.map(job => job.host))] });
}
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return reply({ error: '请求来源无效' }, 403);
  const access = await contentContext();
  if (!access.owner) return reply({ error: '仅站长可操作' }, 403);
  if (access.state.phase !== 'active' || access.paused) return reply({ error: '正式内容暂不可修改' }, 409);
  const body = await request.json().catch(() => null);
  if (body?.action !== 'consolidate') return reply({ error: '操作无效' }, 400);
  if (body.skip && (!Array.isArray(body.skip) || body.skip.length > 500 || body.skip.some((id: unknown) => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)))) {
    return reply({ error: '批次信息无效' }, 400);
  }
  const skipped = new Set<string>(body.skip ?? []);
  const jobId = (source: string) => imageDigest(new TextEncoder().encode(source));
  const current = await readContent(false, access.state);
  const jobs = plan(current.document);
  const replacements = new Map<string, string>();
  const failures: { id: string; host: string; reason: string }[] = [];
  const privateTarget = contentR2();
  const publicConfig = getR2Config();
  const publicClient = createR2Client();
  let downloads = 0;
  for (const job of jobs) {
    if (skipped.has(jobId(job.source))) continue;
    if (job.destination) { replacements.set(job.source, job.destination); continue; }
    if (downloads >= 10) continue;
    downloads++;
    try {
      const bytes = await downloadImage(job.source);
      const format = detectedImageType(bytes);
      const hash = imageDigest(bytes);
      const file = `${hash}.${format.extension}`;
      const bucket = job.public ? publicConfig.bucket : privateTarget.bucket;
      const client = job.public ? publicClient : privateTarget.client;
      const key = job.public ? `content-images/${file}` : `content/live/imported/${file}`;
      try { await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: format.type,
        CacheControl: job.public ? 'public, max-age=31536000, immutable' : 'private, no-store', IfNoneMatch: '*' })); }
      catch (error) { if (!conflict(error)) throw error; }
      const copy = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!copy.Body || copy.ContentType !== format.type || imageDigest(await copy.Body.transformToByteArray()) !== hash) throw new Error('图片副本校验失败');
      replacements.set(job.source, job.public ? `${publicConfig.publicUrl}/${key}` : `/api/content/image?key=${file}`);
    } catch (error) {
      const message = error instanceof Error && /原地址已保留|超过 20 MB|校验失败|地址不能/.test(error.message) ? error.message : '图片复制未完成，原地址已保留';
      const id = jobId(job.source);
      failures.push({ id, host: job.host, reason: message });
      skipped.add(id);
    }
  }
  const next = rewriteImageUrls(current.document, replacements);
  if (replacements.size && !await saveContent(current, next)) return reply({ error: '内容在其他页面更新了，请刷新后重试；原引用未被覆盖' }, 409);
  const remaining = plan(next).length;
  const more = plan(next).some(job => !skipped.has(jobId(job.source)));
  return reply({ complete: remaining === 0, updated: replacements.size, remaining, failures, more });
}
