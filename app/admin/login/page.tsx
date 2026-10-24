'use client'

import { useState } from 'react'
import { safeAuthDestination, startAuth } from '@/utils/auth/flow'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleLogin = async (provider: 'github' | 'google') => {
    setBusy(true)
    setError('')
    const requestedNext = new URLSearchParams(window.location.search).get('next')
    try {
      await startAuth(provider, safeAuthDestination(requestedNext))
    } catch {
      setError('暂时无法连接登录服务，请稍后再试。')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 items-center justify-center min-h-screen bg-[#fafaf8]">
      <h1 className="mb-3 text-xl tracking-widest text-stone-700">登录</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} onClick={() => handleLogin('github')} className="w-56 px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50">使用 GitHub 登录</button>
      <button disabled={busy} onClick={() => handleLogin('google')} className="w-56 px-6 py-3 bg-white border border-stone-300 rounded-lg disabled:opacity-50">使用 Google 登录</button>
    </div>
  )
}
