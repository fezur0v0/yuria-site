'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Profile {
  avatar_url: string | null;
  nickname: string | null;
  bio: string | null;
  links: Record<string, string> | null;
}

const LINK_LABELS: Record<string, string> = {
  github: 'GitHub',
  bilibili: 'Bilibili',
  qq: 'QQ',
  twitter: 'Twitter',
  xiaohongshu: '小红书',
};

export default function SidebarProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('site_settings')
      .select('avatar_url, nickname, bio, links')
      .single()
      .then(({ data }) => setProfile(data));
  }, []);

  if (!profile) return null;

 const links = (profile.links ?? {}) as Record<string, string>;

  return (
    <div className="text-center pb-6 border-b border-black/10">
      {profile.avatar_url && (
        <img
          src={profile.avatar_url}
          alt={profile.nickname ?? ''}
          className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
        />
      )}
      {profile.nickname && <h3 className="font-serif text-base mb-1">{profile.nickname}</h3>}
      {profile.bio && <p className="text-xs text-black/50 leading-relaxed mb-3">{profile.bio}</p>}
      {Object.keys(links).length > 0 && (
        <div className="flex justify-center gap-3 flex-wrap">
          {Object.entries(links).map(([key, url]) =>
            url ? (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-black/40 hover:text-black/70 transition"
              >
                {LINK_LABELS[key] ?? key}
              </a>
            ) : null
          )}
        </div>
      )}
          )}
        </div>
      )}
    </div>
  );
}
