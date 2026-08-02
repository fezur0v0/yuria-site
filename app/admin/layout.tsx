'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  MdOutlineArrowBackIos,
  MdOutlineTune,
  MdOutlineLibraryMusic,
  MdOutlineCollectionsBookmark,
  MdOutlinePhotoLibrary,
} from 'react-icons/md';

const ALLOWED_GITHUB_ID = '261478435';
const supabase = createClient();

const NAV = [
  { href: '/admin', label: '基本设置', icon: MdOutlineTune },
  { href: '/admin/music', label: '音乐', icon: MdOutlineLibraryMusic },
  { href: '/admin/portfolio', label: '作品集', icon: MdOutlineCollectionsBookmark },
  { href: '/admin/gallery', label: '图集', icon: MdOutlinePhotoLibrary },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/admin/login');
        return;
      }
      const githubId = String(
        data.user.user_metadata?.provider_id || data.user.user_metadata?.sub || ''
      );
      if (githubId !== ALLOWED_GITHUB_ID) {
        router.push('/admin/unauthorized');
        return;
      }
      setLoading(false);
    });
  }, []);

  const isEditorPage = /^\/admin\/portfolio\/(new|.+\/edit)$/.test(pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-black/30">
        加载中...
      </div>
    );
  }

  if (isEditorPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#fafaf8] lg:flex">
      {/* 桌面侧边栏 */}
      <aside className="hidden lg:flex lg:flex-col w-60 flex-shrink-0 border-r border-black/[0.06] bg-white px-5 py-8">
        <button
          onClick={() => router.back()}
          style={{ fontFamily: 'Noto Serif SC,serif' }}
          className="text-left text-lg font-light tracking-widest text-black/80 mb-8 px-1 hover:text-black/50 transition-colors"
        >
          管理面板
        </button>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active ? 'bg-black text-white' : 'text-black/50 hover:bg-black/[0.04] hover:text-black/80'
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 移动端顶部：只剩标题，可点击返回 */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/[0.06]">
        <div className="flex items-center justify-center px-4 h-12">
          <button
            onClick={() => router.back()}
            style={{ fontFamily: 'Noto Serif SC,serif' }}
            className="text-sm font-light tracking-widest text-black/70"
          >
            管理面板
          </button>
        </div>
      </div>

      <main className="flex-1 min-w-0 px-5 py-8 pb-28 lg:px-10 lg:py-10 lg:pb-10 max-w-3xl mx-auto w-full">
        {children}
      </main>

      {/* 移动端底部导航栏 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-black/[0.06] flex justify-around items-center px-2 pt-2"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => router.back()}
          className="flex flex-col items-center gap-1 px-3 py-1 text-black/40"
        >
          <MdOutlineArrowBackIos size={18} />
          <span className="text-[9px] tracking-wide">返回</span>
        </button>
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                active ? 'text-black' : 'text-black/40'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
