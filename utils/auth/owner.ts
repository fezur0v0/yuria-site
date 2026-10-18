import type { User } from '@supabase/supabase-js';

export const OWNER_GITHUB_ID = '261478435';

export function isOwnerUser(user: Pick<User, 'identities'> | null | undefined) {
  return user?.identities?.some((identity) => {
    if (identity.provider !== 'github') return false;
    const identityData = identity.identity_data as Record<string, unknown> | undefined;
    const githubId = identityData?.provider_id ?? identityData?.sub ?? identityData?.id;
    return String(githubId ?? '') === OWNER_GITHUB_ID;
  }) ?? false;
}
