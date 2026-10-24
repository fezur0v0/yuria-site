'use client'

import { useState } from 'react'
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

  return <div className="mt-8 flex flex-col items-start gap-4 text-sm">
    {linked && hasGoogle &&
      <p role="status" className="text-green-700">Google 已连接到当前账号。</p>}
    {isOwner && !hasGoogle && <button type="button" disabled={busy} onClick={linkGoogle} className="rounded-lg border border-stone-300 px-5 py-2.5 disabled:opacity-50">绑定 Google 账号</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="button" disabled={busy} onClick={signOut} className="text-stone-500 underline underline-offset-4 disabled:opacity-50">退出登录</button>
  </div>
}
