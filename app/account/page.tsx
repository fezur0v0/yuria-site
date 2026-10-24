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
    <div className="account-scene__grain" aria-hidden="true" />
    <div className="account-shell">
      <nav className="account-topbar" aria-label="页面导航">
        <Link href="/" className="account-wordmark">Yuria</Link>
        <Link href="/" className="account-return">返回网站 <span aria-hidden="true">↗</span></Link>
      </nav>

      <div className="account-heading">
        <span className="account-eyebrow">PERSONAL ARCHIVE · 01</span>
        <h1>账号与安全</h1>
        <p>在这里整理属于你的登录方式。</p>
      </div>

      <article className="account-paper">
        <header className="account-profile">
          <div className="account-profile__avatar"><AccountAvatar name={name} avatar={avatar} size="large" /></div>
          <div className="account-profile__text">
            <span className="account-caption">PROFILE / 个人资料</span>
            <h2>{name}</h2>
            <span className="account-profile__email">{user.email ?? '暂无邮箱'}</span>
          </div>
          {isOwner && <span className="account-profile__owner">站长</span>}
        </header>

        <section className="account-section" aria-labelledby="account-methods">
          <div className="account-section__intro">
            <span className="account-caption">02 / SIGN-IN METHODS</span>
            <h2 id="account-methods">登录方式</h2>
            <p>已经连接的账号，都可以用来登录这里。</p>
          </div>
          <div className="account-methods">
            {hasGithub && <div className="account-method">
              <span className="account-method__icon"><FiGithub size={19} /></span>
              <span className="account-method__name">GitHub</span>
              <span className="account-method__state"><span className="account-method__dot" />已连接</span>
            </div>}
            <AccountControls isOwner={isOwner} hasGoogle={hasGoogle} userId={user.id} linked={(await searchParams).linked === 'google'} />
          </div>
        </section>

        <footer className="account-footer">
          <span className="account-caption">YOU ARE HERE · YURIA</span>
          {isOwner && <Link href="/admin" className="account-admin-link">进入管理面板 <FiArrowUpRight size={16} /></Link>}
        </footer>
      </article>
      <p className="account-footnote">Private space, quietly kept.</p>
    </div>
  </main>
}
