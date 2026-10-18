'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { isOwnerUser } from '@/utils/auth/owner';

export function useIsOwner() {
  const [isOwner, setIsOwner] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(isOwnerUser(data.user));
      setChecked(true);
    });
  }, []);

  return { isOwner, checked };
}
