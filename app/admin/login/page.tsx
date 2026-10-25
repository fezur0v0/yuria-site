'use client'

import { useState } from 'react'
import { FiGithub } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'
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
    <div className="flex flex-col gap-3 items-center justify-center min-h-screen bg-[#f7f7f7]">
      <h1 className="mb-3 text-xl tracking-widest text-neutral-700">登录</h1>
      {error && <p role="alert" className="text-sm text-neutral-700">{error}</p>}
      <button disabled={busy} onClick={() => handleLogin('github')} className="flex items-center justify-center gap-3 w-56 px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50"><FiGithub size={17} aria-hidden="true" />使用 GitHub 登录</button>
      <button disabled={busy} onClick={() => handleLogin('google')} className="flex items-center justify-center gap-3 w-56 px-6 py-3 bg-white border border-neutral-300 rounded-lg disabled:opacity-50"><SiGoogle size={16} aria-hidden="true" />使用 Google 登录</button>
    </div>
  )
}
