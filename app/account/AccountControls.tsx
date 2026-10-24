'use client'

import { useState } from 'react'
import { FiLogOut } from 'react-icons/fi'
import { createClient } from '@/utils/supabase/client'
import { startAuth } from '@/utils/auth/flow'

export default function AccountControls({ isOwner, hasGoogle, userId, linked }: { isOwner: boolean; hasGoogle: boolean; userId: string; linked: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function linkGoogle() {
    setBusy(true)
    setError('')
    try {
      const { data: { user }, error: authError } = await createClient().auth.getUser()
      if (authError || user?.id !== userId) throw new Error('Session changed')
      await startAuth('google', '/account', userId)
    } catch {
      setError('绑定没有开始，请刷新页面后重试。')
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    setError('')
    const { error: authError } = await createClient().auth.signOut({ scope: 'local' })
    if (authError) {
      setError('退出失败，请稍后重试。')
      setBusy(false)
      return
    }
    window.location.replace('/')
  }

  return <>
    {(hasGoogle || isOwner) && <div className="account-method">
      <span className="account-method__icon account-method__icon--google">G</span>
      <span className="account-method__name">Google</span>
      {hasGoogle
        ? <span className="account-method__state"><span className="account-method__dot" />已连接</span>
        : <button type="button" disabled={busy} onClick={linkGoogle} className="account-method__action">连接账号 ↗</button>}
    </div>}
    {linked && hasGoogle && <p role="status" className="account-notice">Google 已连接到当前账号。</p>}
    {error && <p role="alert" className="account-notice account-notice--error">{error}</p>}
    <button type="button" disabled={busy} onClick={signOut} className="account-signout"><FiLogOut size={15} />退出登录</button>
  </>
}
