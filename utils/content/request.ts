import 'server-only';
import { createClient } from '@/utils/supabase/server';
import { isOwnerUser } from '@/utils/auth/owner';
import { cookies } from 'next/headers';
import { readCutover } from '@/utils/content/cutover';
import { contentEpoch } from '@/utils/migration/cutover';

export async function contentContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const owner = !error && isOwnerUser(user);
  const { state } = await readCutover();
  const live = state.phase === 'active' || process.env.CONTENT_BACKEND === 'r2';
  const preview = !live && owner && (await cookies()).get('yuria-r2-preview')?.value === '1';
  return { supabase, owner, preview, r2: preview || live, state,
    epoch: preview ? 'preview' : contentEpoch(state), paused: state.phase === 'preparing',
    backupPrefix: !preview && state.phase === 'active' ? state.prefix : process.env.R2_CONTENT_BACKUP_PREFIX };
}
