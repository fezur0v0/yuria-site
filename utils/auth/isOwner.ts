import { createClient } from '@/utils/supabase/server';

const ALLOWED_GITHUB_ID = '261478435';

export async function isOwnerRequest() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  return user.identities?.some((identity) => {
    if (identity.provider !== 'github') return false;
    const identityData = identity.identity_data as Record<string, unknown> | undefined;
    const githubId = identityData?.provider_id ?? identityData?.sub ?? identityData?.id;
    return String(githubId ?? '') === ALLOWED_GITHUB_ID;
  }) ?? false;
}
