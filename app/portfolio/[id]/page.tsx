import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiEdit3, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { Vibrant } from 'node-vibrant/node';
import PortfolioNav from '@/components/PortfolioNav';
import FloatingWidget from '@/components/FloatingWidget';
import SidebarProfile from '@/components/SidebarProfile';

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

  let mainColor = '#c4c4c4';
  if (item.cover_url) {
    try {
      const res = await fetch(item.cover_url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const palette = await Vibrant.from(buffer).getPalette();
      mainColor = palette.Vibrant?.hex ?? palette.LightVibrant?.hex ?? palette.Muted?.hex ?? mainColor;
    } catch (err) {
      console.error('【提取主色调失败】:', err);
    }
  }

  const { data: siblings } = await supabase
    .from('portfolio_items')
    .select('id, title')
    .eq('category', item.category)
    .order('date', { ascending: true });

  const idx = siblings?.findIndex((s) => s.id === item.id) ?? -1;
  const prev = idx > 0 ? siblings![idx - 1] : null;
  const next = siblings && idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <div className="relative min-h-screen">
      {/* 
        【图层 1：最底层纯色画布】
        全屏固定纯色背景，不再做渐变，贯穿全局
      */}
      <div
        className="fixed inset-0 -z-10 transition-colors duration-500"
        style={{
          // 带 20% 左右透明度的提亮纯色；如果想直接用 100% 提取原色，可以改成 `backgroundColor: mainColor`
          backgroundColor: `${mainColor}33`,
        }}
      />

      <PortfolioNav homeHref="/portfolio" />
      <FloatingWidget />

      {/* 
        【图层 2：封面图】
        随内容滚动,只在文章最上方出现一次,顶部不透明往下渐隐溶解到图层 1 纯色画布中
      */}
      {item.cover_url && (
        <div
          className="absolute top-0 left-0 w-full h-[60vh] -z-[5]"
          style={{
            backgroundImage: `url(${item.cover_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 90%)',
          }}
        />
      )}

      {/* 【图层 3：最上层正文与内容卡片】 */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-28 pb-16 flex flex-col lg:flex-row gap-12">
        {/* 信息栏 */}
        <aside className="order-2 lg:order-1 w-full lg:w-80 flex-shrink-0">
          <div className="lg:sticky lg:top-24 flex flex-col gap-5">
            <SidebarProfile />

            {/* 目录卡片 */}
            <div
              className="rounded-2xl shadow-sm p-6"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.7))' }}
            >
              <h4 className="text-sm font-serif mb-3 text-black/70">目录</h4>
              <p className="text-xs text-black/30">目录联动开发中…</p>
            </div>
          </div>
        </aside>

        {/* 正文 */}
        <main className="order-1 lg:order-2 flex-1 min-w-0">
          <div
            className="rounded-2xl shadow-sm p-8"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.78))' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <h1 className="text-2xl font-serif">{item.title}</h1>
              <Link
                href={`/admin/portfolio/${item.id}/edit`}
                className="text-black/30 hover:text-black/60 transition-colors"
                title="编辑"
              >
                <FiEdit3 size={16} />
              </Link>
            </div>

            <div className="flex items-center gap-3 mb-8 text-xs text-black/40 flex-wrap">
              {item.date && <span>{item.date}</span>}
              {item.category && (
                <span className="px-2 py-0.5 rounded-full bg-black/5">{item.category}</span>
              )}
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

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-black/10">
              {prev ? (
                <Link
                  href={`/portfolio/${prev.id}`}
                  className="group flex items-center gap-2 text-sm text-black/50 hover:text-black/80 transition-colors active:scale-95"
                >
                  <FiArrowLeft className="transition-transform duration-200 group-hover:-translate-x-1.5" size={14} />
                  <span className="transition-transform duration-200 group-hover:-translate-x-1">{prev.title}</span>
                </Link>
              ) : <span />}

              {next ? (
                <Link
                  href={`/portfolio/${next.id}`}
                  className="group flex items-center gap-2 text-sm text-black/50 hover:text-black/80 transition-colors active:scale-95 ml-auto"
                >
                  <span className="transition-transform duration-200 group-hover:translate-x-1">{next.title}</span>
                  <FiArrowRight className="transition-transform duration-200 group-hover:translate-x-1.5" size={14} />
                </Link>
              ) : <span />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
