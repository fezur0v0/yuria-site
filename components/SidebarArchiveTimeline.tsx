'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface ArchiveEntry {
  id: string;
  title: string;
  date: string | null;
}

export default function SidebarArchiveTimeline() {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, date')
      .order('date', { ascending: false })
      .limit(10)
      .then(({ data }) => setEntries(data ?? []));
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-8">
      <h4 className="text-sm text-black/40 mb-4 tracking-wide">归档</h4>
      <div className="relative pl-4">
        <div className="absolute left-[5px] top-1 bottom-1 w-px bg-black/10" />
        <div className="flex flex-col gap-4">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/portfolio/${entry.id}`} className="relative block group">
              <span className="absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-black/30 group-hover:bg-black/70 transition" />
              <p className="text-xs text-black/40 mb-0.5">{entry.date}</p>
              <p className="text-sm text-black/80 group-hover:text-black transition line-clamp-1">{entry.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
