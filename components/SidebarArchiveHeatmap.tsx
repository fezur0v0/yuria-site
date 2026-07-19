'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

function getPastYearDates() {
  const today = new Date();
  const days: Date[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

function levelClass(count: number) {
  if (count === 0) return 'bg-black/5';
  if (count === 1) return 'bg-black/25';
  if (count === 2) return 'bg-black/50';
  return 'bg-black/80';
}

export default function SidebarArchiveHeatmap() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    supabase
      .from('portfolio_items')
      .select('date')
      .gte('date', oneYearAgo.toISOString().slice(0, 10))
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((item) => {
          if (item.date) {
            map[item.date] = (map[item.date] ?? 0) + 1;
          }
        });
        setCounts(map);
      });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [counts]);

  const days = getPastYearDates();
  const firstDayOfWeek = days[0].getDay();
  const padded = [...Array(firstDayOfWeek).fill(null), ...days];
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm p-6">
      <h4 className="text-xs text-black/40 mb-3 tracking-wide">归档</h4>
      <div ref={scrollRef} className="overflow-x-auto [&::-webkit-scrollbar]:h-1">
        <div className="flex gap-[3px]" style={{ width: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) =>
                day ? (
                  <div
                    key={di}
                    title={`${day.toISOString().slice(0, 10)}: ${counts[day.toISOString().slice(0, 10)] ?? 0}篇`}
                    className={`w-[10px] h-[10px] rounded-[2px] ${levelClass(
                      counts[day.toISOString().slice(0, 10)] ?? 0
                    )}`}
                  />
                ) : (
                  <div key={di} className="w-[10px] h-[10px]" />
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-black/30 mt-2">过去一年发布记录</p>
    </div>
  );
}
