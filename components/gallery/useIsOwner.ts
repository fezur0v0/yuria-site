'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useIsOwner() {
  const [isOwner, setIsOwner] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function refreshOwnerStatus() {
      try {
        const response = await fetch('/api/auth/owner', { cache: 'no-store' });
        const data = response.ok
          ? await response.json() as { isOwner?: boolean }
          : null;

        if (!cancelled) setIsOwner(data?.isOwner === true);
      } catch {
        if (!cancelled) setIsOwner(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    void refreshOwnerStatus();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshOwnerStatus();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { isOwner, checked };
}
