'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FiLogIn } from 'react-icons/fi'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import './account-entry.css'

type Placement = 'sidebar' | 'header' | 'dock' | 'drawer'

function avatarFor(user: User | null) {
  const value = user?.user_metadata?.avatar_url
  return typeof value === 'string' && /^https:\/\//.test(value) ? value : null
}

export function AccountAvatar({ name, avatar, size = 'small' }: { name: string; avatar: string | null; size?: 'small' | 'large' }) {
  return <span className={`account-avatar account-avatar--${size}`} aria-hidden="true">
    {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : name.slice(0, 1).toUpperCase()}
  </span>
}

export default function AccountEntry({ placement, light = false }: { placement: Placement; light?: boolean }) {
  const [user, setUser] = useState<User | null>(null)
  const [checked, setChecked] = useState(false)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    void supabase.auth.getUser().then(({ data }) => {
      if (active) { setUser(data.user); setChecked(true) }
    }).catch(() => { if (active) setChecked(true) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setChecked(true) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const name = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user?.email?.split('@')[0] ?? '访客'
  const avatar = avatarFor(user)
  const icon = <AccountAvatar name={name} avatar={avatar} />

  if (!checked) {
    return <span className={`account-entry account-entry--${placement} ${light ? 'account-entry--light' : ''}`} aria-hidden="true">
      {placement === 'dock' ? <FiLogIn size={23} /> : icon}{placement !== 'dock' && <span className="account-entry__label">账号</span>}
    </span>
  }

  if (!user) {
    return <Link href="/admin/login?next=%2Faccount" className={`account-entry account-entry--${placement} ${light ? 'account-entry--light' : ''}`} aria-label="登录账号">
      {placement === 'dock' ? <FiLogIn size={23} aria-hidden="true" /> : icon}{placement !== 'dock' && <span className="account-entry__label">登录</span>}
    </Link>
  }

  if (placement === 'dock') {
    return <Link href="/account" className="account-entry account-entry--dock" aria-label="我的账号" title="我的账号">{icon}</Link>
  }

  if (placement === 'drawer') {
    return <Link href="/account" className="account-entry account-entry--drawer">
      {icon}<span>我的账号</span><span className="account-entry__arrow">›</span>
    </Link>
  }

  return <div className={`account-entry-wrap account-entry-wrap--${placement}`} ref={root}>
    <button type="button" className={`account-entry account-entry--${placement} ${light ? 'account-entry--light' : ''}`}
      aria-label="打开账号菜单" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      {icon}<span className="account-entry__label">{placement === 'sidebar' ? name : '账号'}</span>
      {placement === 'sidebar' && <span className="account-entry__arrow">›</span>}
    </button>
    {open && <div className="account-entry-menu">
      <span className="account-entry-menu__eyebrow">MY ACCOUNT</span>
      <span className="account-entry-menu__name">{name}</span>
      <Link href="/account" onClick={() => setOpen(false)}>账号与安全 <span>↗</span></Link>
    </div>}
  </div>
}
