import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { isOwnerUser } from '@/utils/auth/owner';
import { cookies } from 'next/headers';

export async function contentContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const owner = !error && isOwnerUser(user);
  const preview = owner && (await cookies()).get('yuria-r2-preview')?.value === '1';
  return { supabase, owner, preview, r2: preview || process.env.CONTENT_BACKEND === 'r2' };
}
