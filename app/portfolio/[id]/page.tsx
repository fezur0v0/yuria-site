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

  // 提取封面主色调,用于背景渐变(失败就用兜底色,不影响页面正常显示)
  let mainColor = '#c4c4c4';
  if (item.cover_url) {
    try {
      const res = await fetch(item.cover_url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const palette = await Vibrant.from(buffer).getPalette();
  // 👇 1. 打印整张图片的色彩调色板，看看所有颜色是什么
    console.log('【Vibrant调色板结果】:', {
      Vibrant: palette.Vibrant?.hex,
      LightVibrant: palette.LightVibrant?.hex,
      DarkVibrant: palette.DarkVibrant?.hex,
      Muted: palette.Muted?.hex,
      LightMuted: palette.LightMuted?.hex,
      DarkMuted: palette.DarkMuted?.hex,
    });

    // 👇 2. 建议把优先顺序调整一下，优先取 Vibrant（鲜艳）色
    mainColor = palette.Vibrant?.hex ?? palette.LightVibrant?.hex ?? palette.Muted?.hex ?? mainColor;
    console.log('【最终选择的主色】:', mainColor);

  } catch (err) {
    console.error('【提取主色调失败】:', err);
  }
}

  // 同分类的上一篇/下一篇
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
      {/* 主色调渐变背景,取代原来的固定背景图 */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: `linear-gradient(180deg, ${mainColor}55 0%, #f4f4f2 55%)` }}
      />

      <PortfolioNav homeHref="/portfolio" />
      <FloatingWidget />

      {/* 封面横幅 — 随内容滚动,只在文章最上方出现一次,顶部不透明往下渐隐 */}
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

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20 flex flex-col lg:flex-row gap-8 items-start">
        {/* 信息栏 */}
        <aside className="w-full lg:w-80 lg:sticky lg:top-24 flex flex-col gap-6 order-2 lg:order-1">
          <SidebarProfile />

          {/* 目录卡片 — 占位,下一步做联动 */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-sm p-6">
            <h4 className="text-sm font-serif mb-3 text-black/70">目录</h4>
            <p className="text-xs text-black/30">目录联动开发中…</p>
          </div>
        </aside>

        {/* 正文 */}
        <main className="flex-1 order-1 lg:order-2 min-w-0">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-sm p-8">
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

            {/* 上一篇 / 下一篇(同分类) */}
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
