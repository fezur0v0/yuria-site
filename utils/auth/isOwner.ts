import { createClient } from '@/utils/supabase/server';
import { isOwnerUser } from '@/utils/auth/owner';

export async function isOwnerRequest() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return isOwnerUser(user);
}
