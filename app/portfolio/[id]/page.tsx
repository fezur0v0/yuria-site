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

  // --- 颜色提取逻辑 ---
  let mainColor = '#80a8cc'; // 默认设为一个好看的冰蓝色，方便测试
  if (item.cover_url) {
    try {
      // 直接把图片 URL 传给 Vibrant
      const palette = await Vibrant.from(item.cover_url).getPalette();
      const hex = palette.Vibrant?.hex ?? palette.LightVibrant?.hex ?? palette.Muted?.hex;
      if (hex) {
        mainColor = hex;
      }
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
        【图层 1：最底层画布】
        全屏固定背景，使用提取出的 mainColor 作为大背景底色氛围
      */}
      <div
        className="fixed inset-0 -z-20 transition-colors duration-700"
        style={{
          // 顶部是 35% 透明度的提取主色，向下慢慢过渡到原本的灰白底色 #f4f4f2
          background: `linear-gradient(180deg, ${mainColor}55 0%, ${mainColor}15 40%, #f4f4f2 100%)`,
        }}
      />

      <PortfolioNav homeHref="/portfolio" />
      <FloatingWidget />

      {/* 
        【图层 2：中间封面图】
        随内容滚动，只在最上方出现，带 Mask 蒙版渐隐
      */}
      {item.cover_url && (
        <div
          className="absolute top-0 left-0 w-full h-[65vh] -z-10 pointer-events-none"
          style={{
            backgroundImage: `url(${item.cover_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
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
              className="rounded-2xl shadow-sm p-6 backdrop-blur-md"
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
            className="rounded-2xl shadow-sm p-8 backdrop-blur-md"
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
