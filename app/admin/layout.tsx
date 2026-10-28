'use client';
import { usePathname } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/unauthorized';
  const isEditorPage = /^\/admin\/portfolio\/(new|.+\/edit)$/.test(pathname);

  if (isAuthPage || isEditorPage) return <>{children}</>;

  return <div className="min-h-screen bg-[#fafaf8]">
    <AdminNav key={pathname} />
    <main className="mx-auto w-full max-w-3xl px-5 pb-12 pt-24 lg:px-10 lg:pb-10 lg:pt-[104px]">
      {children}
    </main>
  </div>;
}
