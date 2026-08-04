'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const ALLOWED_GITHUB_ID = '261478435';

export function useIsOwner() {
  const [isOwner, setIsOwner] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const githubId = String(
        data.user?.user_metadata?.provider_id || data.user?.user_metadata?.sub || ''
      );
      setIsOwner(githubId === ALLOWED_GITHUB_ID);
      setChecked(true);
    });
  }, []);

  return { isOwner, checked };
}
