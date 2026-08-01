export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiEdit3, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { Vibrant } from 'node-vibrant/node';
import PortfolioNav from '@/components/PortfolioNav';
import FloatingWidget from '@/components/FloatingWidget';
import SidebarProfile from '@/components/SidebarProfile';
import TableOfContents from '@/components/TableOfContents';

interface PortfolioItem {
id: string;
title: string;
category: string | null;
date: string | null;
tags: string[] | null;
content: string | null;
cover_url: string | null;
}

interface TocItem {
id: string;
text: string;
level: 2 | 3;
}

function processArticleContent(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  let idx = 0;

  const processedHtml = html.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/g, (_match, tag: string, attrs: string, inner: string) => {
    const id = `heading-${idx++}`;
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (text) toc.push({ id, text, level: tag === 'h2' ? 2 : 3 });
    return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
  });

  return { html: processedHtml, toc };
}

export default async function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
const { id } = await params;
const supabase = createClient();

const { data: item } = await supabase
.from('portfolio_items')
.select('id, title, category, date, tags, content, cover_url')
.eq('id', id)
.single();

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

const { html: contentHtml, toc } = processArticleContent(item.content ?? '');

return (
  <div className="relative min-h-screen">
    {/* 主色调渐变背景 */}
    <div
      className="fixed inset-0 -z-10 transition-colors duration-500"
      style={{ backgroundColor: `${mainColor}33` }}
    />

  <PortfolioNav homeHref="/portfolio" />
  <FloatingWidget tocItems={toc} />

  {/* 封面横幅 */}
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

  {/* 主体区域 */}
  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-[30vh] sm:pt-[36vh] pb-8 sm:pb-16 flex flex-col lg:flex-row items-start gap-6 lg:gap-12">
    {/* 侧边栏 */}
    <aside className="order-2 lg:order-1 w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-24">
      <div className="flex flex-col gap-5">
        <SidebarProfile />
        {toc.length > 0 && (
          <div className="hidden lg:block">
            <TableOfContents items={toc} />
          </div>
        )}
      </div>
    </aside>

    {/* 正文区域 */}
    <main className="order-1 lg:order-2 flex-1 min-w-0 w-full">
      <div className="bg-white/60 backdrop-blur-md isolate transform-gpu rounded-2xl shadow-sm p-5 sm:p-8">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-2xl font-serif truncate">{item.title}</h1>
            <Link
              href={`/admin/portfolio/${item.id}/edit`}
              className="text-black/30 hover:text-black/60 transition-colors flex-shrink-0"
              title="编辑"
            >
              <FiEdit3 size={16} />
            </Link>
          </div>
          {item.date && <span className="text-xs text-black/40 flex-shrink-0">{item.date}</span>}
        </div>

        <div className="flex items-center gap-3 mb-5 sm:mb-8 text-xs text-black/40 flex-wrap">
          {item.category && (
            <span className="px-2 py-0.5 rounded-full bg-black/5">{item.category}</span>
          )}
    {item.tags?.map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-black/5">
              #{tag}
            </span>
          ))}
        </div>

        {/* 渲染替换后的富文本 */}
        <div
          className="prose prose-neutral max-w-none prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        <div className="flex items-center justify-between mt-10 pt-6">
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
