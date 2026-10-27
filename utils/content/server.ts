import 'server-only';
import { createClient as createQueryClient } from '@supabase/supabase-js';
import { contentContext } from '@/utils/content/request';
import { readContent, tableVersion } from '@/utils/content/store';
import { queryContent, tableName } from '@/utils/migration/query';
import { adaptPrivateMedia } from '@/utils/migration/mediaUrls';
import { readCutover } from '@/utils/content/cutover';
import { adaptImportedMedia } from '@/utils/migration/legacyMedia';

export async function createClient() {
  const access = await contentContext();
  if (!access.r2) return access.supabase;
  return createR2QueryClient(access.owner, access.preview);
}
export function createR2QueryClient(owner: boolean, preview: boolean) {
  return createQueryClient('https://content.yuria.invalid', 'content-query-client', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      if (init?.method && !['GET', 'HEAD'].includes(init.method)) throw new Error('服务端页面只能读取内容');
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      const table = tableName(url.pathname.split('/').pop()!);
      const { state } = await readCutover();
      const { document } = await readContent(preview, state);
      const result = queryContent(document, owner, table, url.searchParams);
      const single = new Headers(init?.headers).get('accept')?.includes('application/vnd.pgrst.object+json');
      if (single && result.rows.length !== 1) return Response.json({ code: 'PGRST116', message: '未找到唯一记录' }, { status: 406 });
      const data = single && owner ? { ...result.rows[0], __content_version: tableVersion(document.tables[table]) } : single ? result.rows[0] : result.rows;
      return Response.json(!preview && state.phase === 'active' ? adaptImportedMedia(data, process.env.NEXT_PUBLIC_SUPABASE_URL) : adaptPrivateMedia(data),
        { headers: { 'Content-Range': `*/${result.count}` } });
    } },
  });
}
