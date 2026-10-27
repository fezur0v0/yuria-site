'use client';
import { createClient as createQueryClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/utils/supabase/client';
import { getBrowserContentMode } from '@/utils/content/browserMode';

const versions = new Map<string, string>();
const queues = new Map<string, Promise<unknown>>();
let queryClient: ReturnType<typeof buildQueryClient> | undefined;

// Keep the existing query-builder interface, while moving content requests behind
// the site's server. Supabase Auth remains a separate, unchanged client.
export function createClient(initialVersions: Record<string, string | undefined> = {}) {
  for (const [table, version] of Object.entries(initialVersions)) {
    if (version && !versions.has(table)) versions.set(table, version);
  }
  return queryClient ??= buildQueryClient();
}

function buildQueryClient() {
  return createQueryClient('https://content.yuria.invalid', 'content-query-client', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const source = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
        const table = source.pathname.split('/').pop()!;
        const write = !['GET', 'HEAD'].includes(init?.method ?? 'GET');
        async function execute() {
          const { data: { session } } = await createAuthClient().auth.getSession();
          const headers = new Headers(init?.headers);
          const mode = await getBrowserContentMode();
          headers.set('X-Yuria-Preview', mode.preview ? '1' : '0');
          headers.set('X-Yuria-Content-Epoch', mode.epoch);
          headers.delete('apikey');
          if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
          else headers.delete('Authorization');
          if (write && !versions.has(table)) {
            const checkHeaders = new Headers(headers);
            checkHeaders.set('Accept', 'application/json');
            checkHeaders.delete('Prefer');
            const check = await fetch(`/api/content/${encodeURIComponent(table)}?limit=0`, { headers: checkHeaders, credentials: 'same-origin', cache: 'no-store' });
            const initialVersion = check.headers.get('X-Yuria-Table-Version');
            if (check.ok && initialVersion) versions.set(table, initialVersion);
          }
          if (write && versions.has(table)) headers.set('X-Yuria-Table-Version', versions.get(table)!);
          const response = await fetch(`/api/content/${encodeURIComponent(table)}${source.search}`, {
            ...init, headers, credentials: 'same-origin', cache: 'no-store',
          });
          const version = response.headers.get('X-Yuria-Table-Version');
          // Background reads must not silently advance an editor's revision.
          if (response.ok && version && (write || !versions.has(table))) versions.set(table, version);
          if (!response.ok && write && response.headers.get('X-Yuria-Content-Backend') === 'r2') {
            const error = await response.clone().json().catch(() => null);
            window.alert(error?.message ?? '保存未完成，请刷新后重试');
          }
          return response;
        }
        if (!write) return execute();
        // Sorting performs multiple patches: serialize per collection so each
        // request receives the version committed by the previous one.
        const result = (queues.get(table) ?? Promise.resolve()).catch(() => undefined).then(execute);
        queues.set(table, result);
        return result;
      },
    },
  });
}
