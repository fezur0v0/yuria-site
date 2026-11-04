'use client';

import { useEffect, useState } from 'react';
import useTocSheet from './useTocSheet';
import styles from './toc-sheet.module.css';
import Link from 'next/link';
import { PiCaretUpBold, PiGearSix, PiListBullets } from 'react-icons/pi';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export default function FloatingWidget({
  tocItems = [],
  settingsHref = '/admin/portfolio',
}: {
  tocItems?: TocItem[];
  settingsHref?: string;
}) {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const toc = useTocSheet();
  
  // 记录当前展开的 H2 id
  const [openH2, setOpenH2] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpen = () => {
    const firstH2 = tocItems.find((i) => i.level === 2);
    setOpenH2(firstH2 ? firstH2.id : null);
    toc.show();
  };

  const handleTocClick = (id: string) => toc.close(id);

  // H2 / H3 数据分组
  const groupedToc = tocItems.reduce<{ h2: TocItem; children: TocItem[] }[]>((acc, item) => {
    if (item.level === 2) acc.push({ h2: item, children: [] });
    else if (acc.length > 0) acc[acc.length - 1].children.push(item);
    return acc;
  }, []);

  // 通用悬浮球样式类名
  const buttonStyle =
    "w-11 h-11 rounded-full bg-[rgba(25,25,25,0.45)] backdrop-blur-[12px] border border-[rgba(255,255,255,0.12)] shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[rgba(255,255,255,0.85)] hover:scale-105 hover:bg-white/80 hover:text-black/80 hover:border-white/50 active:scale-95 transition-all duration-300";

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* 1. 回到顶部按钮（已调整至最上方） */}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={buttonStyle}
            title="回到顶部"
          >
            <PiCaretUpBold size={20} />
          </button>
        )}

        {/* 2. 目录按钮（移动端显示） */}
        {tocItems.length > 0 && (
          <button
            onClick={handleOpen}
            className={`lg:hidden ${buttonStyle}`}
            title="目录"
          >
            <PiListBullets size={20} />
          </button>
        )}

        {/* 3. 设置按钮 —— 唯一改动的地方 */}
        <Link href={settingsHref} className={buttonStyle} title="设置">
          <PiGearSix size={20} />
        </Link>
      </div>

      {toc.open && (
        <div ref={toc.overlay} className={styles.overlay} data-closing={toc.closing} onClick={() => toc.close()}>
          <div ref={toc.sheet} className={styles.sheet} role="dialog" aria-modal="true" aria-label="文章目录" tabIndex={-1} onClick={event => event.stopPropagation()}>
            <div className={styles.dragHeader} {...toc.dragHandlers}>
              <div ref={toc.grip} className={styles.grip} role="separator" tabIndex={0} aria-label="调整目录高度，向上增高、下拉收起" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={60} onKeyDown={toc.resizeKey}>
                <span aria-hidden="true" />
              </div>

            {/* 标题 */}
            <div className={`flex items-center justify-center gap-2 pb-3 mx-6 border-b border-black/[0.05]`}>
              <span className="text-[10px] text-black/30">✦</span>
              <h4 className="text-xs font-serif tracking-[0.25em] text-black/60 uppercase font-medium">
                INDEX
              </h4>
              <span className="text-[10px] text-black/30">✦</span>
            </div>

            </div>

            {/* 目录内容区 */}
            <div
              className={`${styles.content} flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center gap-2.5`}
            >
              {groupedToc.map(({ h2, children }) => {
                const isOpen = openH2 === h2.id;
                const hasChildren = children.length > 0;

                return (
                  <div key={h2.id} className="w-full flex flex-col items-center">
                    {/* H2 标题块：展开时带有特有的柔和阴影与白底 */}
                    <button type="button" aria-expanded={hasChildren ? isOpen : undefined}
                      onClick={() => {
                        if (hasChildren) {
                          setOpenH2(isOpen ? null : h2.id);
                        } else {
                          handleTocClick(h2.id);
                        }
                      }}
                      className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 border ${
                        isOpen
                          ? 'bg-white/80 border-black/5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] text-black/90 font-medium'
                          : 'border-transparent text-black/60 hover:text-black/80 hover:bg-black/[0.03]'
                      }`}
                    >
                      <span className="text-sm tracking-wide text-center line-clamp-1">
                        {h2.text}
                      </span>
                    </button>

                    {/* H3 子章节：折叠动画 */}
                    {hasChildren && (
                      <div inert={!isOpen}
                        className={`w-full flex flex-col items-center overflow-hidden transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-96 opacity-100 py-1.5 gap-1' : 'max-h-0 opacity-0'
                        }`}
                      >
                        {children.map((h3) => (
                          <button
                            key={h3.id}
                            onClick={() => handleTocClick(h3.id)}
                            className="w-full py-1.5 text-center text-xs text-black/45 hover:text-black/80 transition-all active:scale-95"
                          >
                            <span className="line-clamp-1">{h3.text}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
