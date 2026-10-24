'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { safeAuthDestination, takeAuthFlow } from '@/utils/auth/flow'

export default function AuthCompletePage() {
  const [message, setMessage] = useState('正在确认登录…')

  useEffect(() => {
    let cancelled = false
    async function complete() {
      const flow = takeAuthFlow()
      if (new URLSearchParams(window.location.search).has('error')) {
        setMessage('授权没有完成，请返回后重试。')
        return
      }
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !user) {
        setMessage('登录没有完成，请返回后重试。')
        return
      }
      if (flow?.kind === 'link') {
        if (user.id !== flow.userId) {
          await supabase.auth.signOut({ scope: 'local' })
          setMessage('Google 没有绑定到原账号。已退出当前登录，请用原来的 GitHub 账号重试。')
          return
        }
        if (!user.identities?.some(identity => identity.provider === 'google')) {
          setMessage('尚未找到已绑定的 Google 身份，请返回账号页面确认。')
          return
        }
        window.location.replace('/account?linked=google')
        return
      }
      window.location.replace(safeAuthDestination(flow?.next, '/admin'))
    }
    void complete()
    return () => { cancelled = true }
  }, [])

  return <main className="min-h-screen flex flex-col items-center justify-center gap-5 bg-[#fafaf8] px-6 text-center text-stone-700">
    <p role="status">{message}</p>
    <Link href="/admin/login" className="underline underline-offset-4">返回登录</Link>
  </main>
}
