'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiUser } from 'react-icons/fi'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import './account-entry.css'

type Placement = 'sidebar' | 'header' | 'drawer'

function avatarFor(user: User | null) {
  const value = user?.user_metadata?.avatar_url
  return typeof value === 'string' && /^https:\/\//.test(value) ? value : null
}

export function AccountAvatar({ name, avatar, size = 'small' }: { name: string; avatar: string | null; size?: 'small' | 'large' }) {
  return <span className={`account-avatar account-avatar--${size}${avatar ? '' : ' account-avatar--placeholder'}`} aria-hidden="true" title={name}>
    {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <FiUser size={size === 'large' ? 32 : 17} />}
  </span>
}

export default function AccountEntry({ placement, light = false, onNavigate }: { placement: Placement; light?: boolean; onNavigate?: () => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [checked, setChecked] = useState(false)

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

  const name = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user?.email?.split('@')[0] ?? '访客'
  const avatar = avatarFor(user)
  const className = `account-entry account-entry--${placement}${light ? ' account-entry--light' : ''}`
  const content = placement === 'drawer'
    ? <span className="account-polaroid"><span className="account-polaroid__photo"><AccountAvatar name={name} avatar={avatar} size="large" /></span><span className="account-polaroid__caption">{user ? name : '访客登录'}</span></span>
    : <AccountAvatar name={name} avatar={avatar} />

  if (!checked) return <span className={className} aria-hidden="true">{content}</span>

  return <Link href={user ? '/account' : '/admin/login?next=%2Faccount'} className={className}
    aria-label={user ? '账号管理' : '访客登录'} title={user ? '账号管理' : '访客登录'} onClick={onNavigate}>
    {content}
  </Link>
}
