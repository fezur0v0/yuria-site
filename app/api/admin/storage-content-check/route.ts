import { createClient } from '@/utils/supabase/server';
import { isOwnerUser } from '@/utils/auth/owner';
import { readVerifiedContentBackup } from '@/utils/migration/readBackup';
import { CONTENT_TABLES } from '@/utils/migration/backup';
import { visibleContent } from '@/utils/migration/content';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !isOwnerUser(user)) return Response.json({ error: '仅站长可访问' }, { status: 403, headers });
  try {
    const { document, prefix } = await readVerifiedContentBackup();
    const guest = visibleContent(document, false);
    const counts = Object.fromEntries(CONTENT_TABLES.map(name => [name, {
      owner: document.tables[name].length, guest: guest.tables[name].length,
    }]));
    return Response.json({ verified: true, prefix, counts }, { headers });
  } catch {
    return Response.json({ error: 'R2 内容读取校验未通过，请检查备份目录和完成标记；网站仍使用原数据。' }, { status: 503, headers });
  }
}
