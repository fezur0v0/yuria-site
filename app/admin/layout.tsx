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

  // 新建/编辑作品是全屏编辑器页面，不套用后台外壳
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
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs text-black/40 hover:text-black/70 transition-colors mb-10 -ml-1"
        >
          <MdOutlineArrowBackIos size={12} />
          返回首页
        </button>
        <div
          style={{ fontFamily: 'Noto Serif SC,serif' }}
          className="text-lg font-light tracking-widest text-black/80 mb-8 px-1"
        >
          管理面板
        </div>
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

      {/* 移动端顶部：返回 + 横向滚动的胶囊导航 */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/[0.06]">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.push('/')}
            className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full text-black/50 active:bg-black/5"
          >
            <MdOutlineArrowBackIos size={17} />
          </button>
          <span
            style={{ fontFamily: 'Noto Serif SC,serif' }}
            className="text-sm font-light tracking-widest text-black/70"
          >
            管理面板
          </span>
          <div className="w-9" />
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                  active ? 'bg-black text-white' : 'bg-black/[0.04] text-black/50'
                }`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 min-w-0 px-5 py-8 lg:px-10 lg:py-10 max-w-3xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
