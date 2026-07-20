'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface Entry {
  id: string;
  title: string;
  date: string | null;
}

export default function SidebarArchiveTimeline() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolio_items')
      .select('id, title, date')
      .order('date', { ascending: false })
      .then(({ data }) => setEntries(data ?? []));
  }, []);

  const groups: Record<string, Entry[]> = {};
  entries.forEach((entry) => {
    if (!entry.date) return;
    const key = entry.date.slice(0, 7);
    groups[key] = groups[key] ?? [];
    groups[key].push(entry);
  });
  const monthKeys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

  if (monthKeys.length === 0) return null;

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-8">
      <h4 className="text-lg font-bold text-black mb-4">归档</h4>
      <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        <div className="relative">
          <div className="absolute left-[3px] top-2 bottom-2 w-px bg-black/15" />
          <div className="flex flex-col gap-1">
            {monthKeys.map((key) => {
              const isOpen = expanded.has(key);
              const [year, month] = key.split('-');
              return (
                <div key={key}>
                 <button onClick={() => toggle(key)} className="w-full flex items-center gap-3 py-1.5 group">
  <span
    className={`relative z-10 flex-shrink-0 w-[7px] h-[7px] rounded-full border-[1.5px] border-gray-600 transition-colors ${
      isOpen ? 'bg-transparent' : 'bg-gray-600'
    }`}
  />
  <span className="text-sm text-black/70 group-hover:text-black transition">
    {year}年{month}月
  </span>
</button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden min-h-0">
                      <div className="pl-6 flex flex-col gap-1.5 pb-2 pt-1">
                        {groups[key].map((entry) => (
                          <Link
                            key={entry.id}
                            href={`/portfolio/${entry.id}`}
                            className="text-xs text-black/50 hover:text-black transition line-clamp-1"
                          >
                            {entry.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
