'use client'

import { useEffect, useState } from 'react'
import { FiGithub } from 'react-icons/fi'
import { SiGoogle } from 'react-icons/si'
import { getLoginProtection, safeAuthDestination, startAuth } from '@/utils/auth/flow'
import Turnstile from '@/components/auth/Turnstile'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [protection, setProtection] = useState<{ enabled: boolean; siteKey?: string } | null>(null)
  const [token, setToken] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getLoginProtection().then(config => {
      if (cancelled) return
      setProtection(config)
      if (new URLSearchParams(window.location.search).get('error') === 'verification') {
        setError('验证已过期或未完成，请重新验证后登录。')
      }
    })
      .catch(() => { if (!cancelled) setError('登录服务暂时不可用，请重新加载或稍后重试。') })
    return () => { cancelled = true }
  }, [])

  const disabled = busy || !protection || (protection.enabled && !token)

  const handleLogin = async (provider: 'github' | 'google') => {
    if (disabled) return
    setBusy(true)
    setError('')
    const requestedNext = new URLSearchParams(window.location.search).get('next')
    try {
      await startAuth(provider, safeAuthDestination(requestedNext), undefined, token)
    } catch (error) {
      setError(error instanceof Error ? error.message : '暂时无法连接登录服务，请稍后再试。')
      setToken('')
      setAttempt(value => value + 1)
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 items-center justify-center min-h-screen bg-[#f7f7f7] px-6 py-12">
      <h1 className="mb-3 text-xl tracking-widest text-neutral-700">登录</h1>
      {error && <p role="alert" className="max-w-sm text-center text-sm text-neutral-700">{error}</p>}
      {protection?.enabled && protection.siteKey && <div className="w-full max-w-[320px] mb-2">
        <Turnstile key={attempt} siteKey={protection.siteKey} onToken={setToken} onError={setVerificationError} />
        <p role="status" className="mt-2 text-center text-xs text-neutral-500">{verificationError || (token ? '验证通过，可以继续登录。' : '请先完成真人验证。')}</p>
        {verificationError && <button type="button" onClick={() => { setToken(''); setVerificationError(''); setAttempt(value => value + 1) }} className="mt-2 w-full text-xs underline underline-offset-4">重新验证</button>}
      </div>}
      <button disabled={disabled} onClick={() => handleLogin('github')} className="flex items-center justify-center gap-3 w-56 px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50"><FiGithub size={17} aria-hidden="true" />使用 GitHub 登录</button>
      <button disabled={disabled} onClick={() => handleLogin('google')} className="flex items-center justify-center gap-3 w-56 px-6 py-3 bg-white border border-neutral-300 rounded-lg disabled:opacity-50"><SiGoogle size={16} aria-hidden="true" />使用 Google 登录</button>
      {!protection && error && <button type="button" onClick={() => window.location.reload()} className="text-xs underline underline-offset-4">重新加载</button>}
    </div>
  )
}
