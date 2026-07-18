import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface PortfolioItem {
  id: string;
  title: string;
  category: string | null;
  date: string | null;
  tags: string[] | null;
  content: string | null;
  cover_url: string | null;
}

export default async function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();

  const { data: item } = await supabase
    .from('portfolio_items')
    .select('id, title, category, date, tags, content, cover_url')
    .eq('id', id)
    .single<PortfolioItem>();

  if (!item) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/portfolio" className="text-sm text-black/40 hover:text-black/70 transition">
        ← 返回作品集
      </Link>

      {item.cover_url && (
        <img
          src={item.cover_url}
          alt={item.title}
          className="w-full rounded-2xl object-cover mt-6 mb-6 max-h-[420px]"
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-serif">{item.title}</h1>
        <Link
          href={`/admin/portfolio/${item.id}/edit`}
          className="text-black/30 hover:text-black/60 transition"
          title="编辑"
        >
          ✏️
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8 text-xs text-black/40">
        {item.date && <span>{item.date}</span>}
        {item.category && <span className="px-2 py-0.5 rounded-full bg-black/5">{item.category}</span>}
        {item.tags?.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full bg-black/5">
            #{tag}
          </span>
        ))}
      </div>

      <div
        className="prose prose-neutral max-w-none prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: item.content ?? '' }}
      />
    </div>
  );
}
