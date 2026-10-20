import 'server-only';

import type { User } from '@supabase/supabase-js';

const OWNER_GITHUB_ID = process.env.OWNER_GITHUB_ID?.trim();

export function isOwnerUser(user: Pick<User, 'identities'> | null | undefined) {
  if (!OWNER_GITHUB_ID) return false;

  return user?.identities?.some((identity) => {
    if (identity.provider !== 'github') return false;
    const identityData = identity.identity_data as Record<string, unknown> | undefined;
    const githubId = identityData?.provider_id ?? identityData?.sub ?? identityData?.id;
    return String(githubId ?? '') === OWNER_GITHUB_ID;
  }) ?? false;
}
