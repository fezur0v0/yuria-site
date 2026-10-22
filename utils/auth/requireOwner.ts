import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { isOwnerUser } from '@/utils/auth/owner';

const getVerifiedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
});

export async function requireOwner(loginPath = '/admin/login') {
  const context = await getVerifiedUser();
  if (!context.user) redirect(loginPath);
  if (!isOwnerUser(context.user)) redirect('/admin/unauthorized');
  return context;
}
