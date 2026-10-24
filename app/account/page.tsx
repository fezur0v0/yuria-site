import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { isOwnerUser } from '@/utils/auth/owner'
import AccountControls from './AccountControls'

export const dynamic = 'force-dynamic'

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ linked?: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/admin/login?next=%2Faccount')

  const isOwner = isOwnerUser(user)
  const hasGoogle = user.identities?.some(identity => identity.provider === 'google') ?? false
  return <main className="min-h-screen bg-[#fafaf8] px-5 py-12 text-stone-700">
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white/90 p-8 shadow-sm">
      <Link href="/" className="text-sm text-stone-500">← 返回网站</Link>
      <h1 className="mt-8 mb-6 text-2xl tracking-widest">账号与安全</h1>
      <p className="text-sm break-all">{user.email ?? '已登录账号'}</p>
      <p className="mt-4 text-sm">已连接：{user.identities?.map(identity => identity.provider === 'github' ? 'GitHub' : identity.provider === 'google' ? 'Google' : identity.provider).join('、') || '暂无'}</p>
      {isOwner && <Link href="/admin" className="mt-6 block underline underline-offset-4">进入管理面板</Link>}
      <AccountControls isOwner={isOwner} hasGoogle={hasGoogle} userId={user.id} linked={(await searchParams).linked === 'google'} />
    </div>
  </main>
}
