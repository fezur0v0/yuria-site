import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FiArrowUpRight, FiGithub } from 'react-icons/fi'
import { createClient } from '@/utils/supabase/server'
import { isOwnerUser } from '@/utils/auth/owner'
import { AccountAvatar } from '@/components/account/AccountEntry'
import AccountControls from './AccountControls'
import './account.css'

export const dynamic = 'force-dynamic'

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ linked?: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/admin/login?next=%2Faccount')

  const isOwner = isOwnerUser(user)
  const hasGoogle = user.identities?.some(identity => identity.provider === 'google') ?? false
  const hasGithub = user.identities?.some(identity => identity.provider === 'github') ?? false
  const name = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : user.email?.split('@')[0] ?? '访客'
  const avatarValue = user.user_metadata?.avatar_url
  const avatar = typeof avatarValue === 'string' && avatarValue.startsWith('https://') ? avatarValue : null

  return <main className="account-scene">
    <div className="account-shell">
      <nav className="account-topbar" aria-label="页面导航">
        <Link href="/" className="account-wordmark">Yuria</Link>
      </nav>

      <article className="account-poster">
        <section className="account-cover" aria-label="个人资料">
          <div className="account-cover__index"><span>YURIA / MEMBERS</span></div>
          <div className="account-cover__portrait">
            <AccountAvatar name={name} avatar={avatar} size="large" />
          </div>
          <div className="account-cover__identity">
            <span className="account-cover__label">PERSONAL PROFILE</span>
            <div className="account-cover__name"><h2>{name}</h2>{isOwner && <span className="account-cover__owner">站长</span>}</div>
            <p>{user.email ?? '暂无邮箱'}</p>
          </div>
        </section>

        <section className="account-detail" aria-labelledby="account-methods">
          <div className="account-detail__heading">
            <span className="account-detail__index">ACCOUNT ACCESS</span>
            <h1 id="account-methods">登录方式<span aria-hidden="true">.</span></h1>
            <p>使用已连接的账号登录 Yuria。</p>
          </div>
          <div className="account-methods">
            {hasGithub && <div className="account-method">
              <span className="account-method__icon"><FiGithub size={19} /></span>
              <span className="account-method__name">GitHub</span>
              <span className="account-method__state"><span className="account-method__dot" />已连接</span>
            </div>}
            <AccountControls isOwner={isOwner} hasGoogle={hasGoogle} userId={user.id} linked={(await searchParams).linked === 'google'} />
          </div>
          {isOwner && <Link href="/admin" className="account-admin-link">进入管理面板 <FiArrowUpRight size={16} /></Link>}
        </section>
      </article>
    </div>
  </main>
}
