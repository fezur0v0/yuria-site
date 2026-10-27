import { contentContext } from '@/utils/content/request';
import { readContent, saveContent, tableVersion } from '@/utils/content/store';
import { tableName, queryContent, mutateContent } from '@/utils/migration/query';
import { isSameOriginRequest } from '@/utils/security/origin';
import { adaptPrivateMedia } from '@/utils/migration/mediaUrls';
import { previewMatches } from '@/utils/migration/preview';
import { epochMatches } from '@/utils/migration/cutover';
import { adaptImportedMedia } from '@/utils/migration/legacyMedia';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
type Context = { params: Promise<{ table: string }> };

async function handle(request: Request, context: Context) {
  let table;
  try { table = tableName((await context.params).table); }
  catch { return Response.json({ message: '不支持的内容类型' }, { status: 404, headers: privateHeaders }); }
  const write = !['GET', 'HEAD'].includes(request.method);
  if (write && !isSameOriginRequest(request)) return Response.json({ message: '请求来源无效' }, { status: 403, headers: privateHeaders });
  const access = await contentContext();
  if (!previewMatches(request.headers.get('x-yuria-preview'), access.preview)) {
    return Response.json({ message: '预览已结束，请刷新页面后继续', code: 'PREVIEW_EXPIRED' }, {
      status: 409, headers: { ...privateHeaders, 'X-Yuria-Content-Backend': 'r2' },
    });
  }
  if (write && !access.owner) return Response.json({ message: '仅站长可保存内容' }, { status: 403, headers: privateHeaders });
  if (write && (access.paused || !epochMatches(request.headers.get('x-yuria-content-epoch'), access.epoch))) {
    return Response.json({ message: access.paused ? '正在迁移，请暂停编辑，完成后刷新页面' : '内容来源已切换，请刷新页面后再编辑', code: 'CONTENT_MODE_CHANGED' },
      { status: 409, headers: { ...privateHeaders, 'X-Yuria-Content-Backend': 'r2' } });
  }
  const url = new URL(request.url);
  if (!access.r2) {
    // Supabase still verifies the forwarded bearer token and enforces RLS.
    // Identity/owner decisions above always use getUser(), never the client token alone.
    const upstream = new URL(`/rest/v1/${table}`, process.env.NEXT_PUBLIC_SUPABASE_URL!);
    upstream.search = url.search;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const headers = new Headers({ apikey: key, Authorization: request.headers.get('authorization') ?? `Bearer ${key}` });
    for (const name of ['content-type', 'prefer', 'accept', 'range', 'range-unit']) {
      const value = request.headers.get(name); if (value) headers.set(name, value);
    }
    const response = await fetch(upstream, { method: request.method, headers,
      body: write ? await request.text() : undefined, cache: 'no-store' });
    const outgoing = new Headers(privateHeaders);
    for (const name of ['content-type', 'content-range', 'preference-applied']) {
      const value = response.headers.get(name); if (value) outgoing.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: outgoing });
  }
  const headers = new Headers({ ...privateHeaders, 'X-Yuria-Content-Backend': 'r2' });
  try {
    const params = url.searchParams;
    const prefer = request.headers.get('prefer') ?? '';
    const single = request.headers.get('accept')?.includes('application/vnd.pgrst.object+json');
    const body = write && request.method !== 'DELETE' ? await request.json() : null;
    let result;
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await readContent(access.preview, access.state);
      const version = tableVersion(current.document.tables[table]);
      if (write) {
        if (request.headers.get('x-yuria-table-version') !== version) {
          return Response.json({ message: '内容已在其他页面更新，请刷新后重试', code: 'CONTENT_CONFLICT' }, { status: 409, headers });
        }
        const next = structuredClone(current.document);
        const rows = mutateContent(next, table, request.method, params, body, prefer.includes('resolution=merge-duplicates'));
        if (!await saveContent(current, next)) continue;
        headers.set('X-Yuria-Table-Version', tableVersion(next.tables[table]));
        result = { rows, count: rows.length, offset: 0 };
      } else {
        if (access.owner) headers.set('X-Yuria-Table-Version', version);
        result = queryContent(current.document, access.owner, table, params);
      }
      break;
    }
    if (!result) return Response.json({ message: '保存冲突，请刷新后重试' }, { status: 409, headers });
    headers.set('Content-Range', `${result.rows.length ? `${result.offset}-${result.offset + result.rows.length - 1}` : '*'}/${result.count}`);
    if (single && result.rows.length !== 1) return Response.json({ message: '未找到唯一记录', code: 'PGRST116', details: `The result contains ${result.rows.length} rows` }, { status: 406, headers });
    if (request.method === 'HEAD' || write && !prefer.includes('return=representation')) return new Response(null, { status: write ? 204 : 200, headers });
    const data = single ? result.rows[0] : result.rows;
    return Response.json(access.state.phase === 'active' ? adaptImportedMedia(data, process.env.NEXT_PUBLIC_SUPABASE_URL) : adaptPrivateMedia(data),
      { status: request.method === 'POST' ? 201 : 200, headers });
  } catch {
    return Response.json({ message: 'R2 内容操作未完成，请检查内容格式或稍后重试' }, { status: 400, headers });
  }
}
export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
