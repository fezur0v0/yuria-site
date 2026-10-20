'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Particle = {
  x: number
  y: number
  size: number
  opacity: number
  speed: number
}

export default function NotesIntro({ lines }: { lines: string[] }) {
  const router = useRouter()
  const [phase, setPhase] = useState<'intro' | 'auth'>(lines.length > 0 ? 'intro' : 'auth')
  const [currentLine, setCurrentLine] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const [isOwner, setIsOwner] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setParticles(Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 20 + 15,
    })))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    let cancelled = false

    async function checkOwner() {
      try {
        const response = await fetch('/api/auth/owner', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Identity check failed')
        const data = await response.json() as { isOwner?: boolean }
        if (!cancelled) setIsOwner(data.isOwner === true)
      } catch {
        if (!cancelled) setIsOwner(false)
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setChecked(true)
      }
    }

    void checkOwner()
    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  // Preserve the original sequence and timing, including when revisiting while signed in.
  useEffect(() => {
    if (phase !== 'intro' || lines.length === 0) return

    function runLine(index: number) {
      if (index >= lines.length) {
        timerRef.current = setTimeout(() => setPhase('auth'), 600)
        return
      }
      setCurrentLine(index)
      setOpacity(0)
      timerRef.current = setTimeout(() => {
        setOpacity(1)
        timerRef.current = setTimeout(() => {
          setOpacity(0)
          timerRef.current = setTimeout(() => runLine(index + 1), 800)
        }, 2200)
      }, 100)
    }

    runLine(0)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [lines, phase])

  function skip() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpacity(0)
    timerRef.current = setTimeout(() => setPhase('auth'), 300)
  }

  async function handleSubmit() {
    if (submitting || !checked) return
    setSubmitting(true)
    setError('')

    const requestedNext = new URLSearchParams(window.location.search).get('next')
    const next = requestedNext?.startsWith('/notes/') && !requestedNext.includes('\\')
      ? requestedNext
      : '/notes/library'

    if (isOwner) {
      // The destination is independently protected by the server and database RLS.
      router.push(next)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          skipBrowserRedirect: true,
        },
      })
      if (authError || !data.url) throw authError ?? new Error('Missing OAuth URL')
      window.location.assign(data.url)
    } catch {
      setError('暂时无法连接 GitHub，请稍后再试')
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: '"Noto Serif SC", "STSong", serif',
    }}>
      {/* 粒子背景 */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: '50%',
          background: '#fff',
          opacity: p.opacity,
          animation: `float ${p.speed}s ease-in-out infinite alternate`,
          animationDelay: `${i * 0.3}s`,
          pointerEvents: 'none',
        }} />
      ))}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&display=swap');
        @keyframes float {
          from { transform: translateY(0px) translateX(0px); opacity: 0.1; }
          to { transform: translateY(-30px) translateX(10px); opacity: 0.5; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; } 50% { opacity: 1; }
        }
      `}</style>

      {/* 开场动画 */}
      {phase === 'intro' && (
        <>
          {/* 跳过按钮 */}
          <button type="button" onClick={skip} style={{
            position: 'absolute', top: '32px', right: '32px',
            color: 'rgba(255,255,255,0.4)', fontSize: '13px',
            background: 'none', border: 'none', cursor: 'pointer',
            letterSpacing: '0.1em', transition: 'color 0.2s',
            fontFamily: '"Noto Serif SC", serif',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            跳过 ›
          </button>

          {/* 文字 */}
          <div style={{
            textAlign: 'center',
            opacity: opacity,
            transition: 'opacity 0.8s cubic-bezier(0.4,0,0.2,1)',
            padding: '0 40px',
            maxWidth: '600px',
          }}>
            {lines[currentLine] && (() => {
              const line = lines[currentLine].trim()
              // 最后一句大字
              const isLast = currentLine === lines.length - 1
              if (isLast) {
                const [lead, ...rest] = line.split(/\s+/)
                const title = rest.length > 0 ? rest.join(' ') : lead
                return (
                  <div>
                    {rest.length > 0 && <div style={{ fontSize: 'clamp(14px,3vw,18px)', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: '12px' }}>{lead}</div>}
                    <div style={{ fontSize: 'clamp(28px,6vw,48px)', fontWeight: 300, color: '#fff', letterSpacing: '0.15em' }}>{title}</div>
                  </div>
                )
              }
              // 偶数行小字，奇数行大字，错落效果
              const isOdd = currentLine % 2 === 0
              return (
                <div style={{
                  fontSize: isOdd ? 'clamp(22px,5vw,38px)' : 'clamp(16px,3.5vw,24px)',
                  fontWeight: 300,
                  color: isOdd ? '#fff' : 'rgba(255,255,255,0.7)',
                  letterSpacing: isOdd ? '0.2em' : '0.3em',
                  lineHeight: 1.8,
                  textAlign: isOdd ? 'center' : 'center',
                  marginLeft: isOdd ? '0' : 'clamp(20px,5vw,60px)',
                }}>
                  {line}
                </div>
              )
            })()}
          </div>

          {/* 底部进度点 */}
          <div style={{
            position: 'absolute', bottom: '48px',
            display: 'flex', gap: '10px',
          }}>
            {lines.map((_, i) => (
              <div key={i} style={{
                width: i === currentLine ? '20px' : '5px',
                height: '5px',
                borderRadius: '3px',
                background: i === currentLine ? '#fff' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
        </>
      )}

      {/* GitHub 验证 */}
      {phase === 'auth' && (
        <div style={{
          animation: 'fadeInUp 0.5s ease forwards',
          background: 'rgba(20,20,20,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: 'clamp(32px,6vw,52px) clamp(28px,6vw,52px)',
          width: 'min(400px, 90vw)',
          textAlign: 'center',
        }}>
          {/* 锁图标 */}
          <div style={{
            width: '48px', height: '48px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>

          <div style={{ fontSize: 'clamp(18px,4vw,22px)', fontWeight: 300, color: '#fff', letterSpacing: '0.3em', marginBottom: '8px' }}>
            小 剧 场
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: '28px' }}>
            {isOwner ? '身份已确认，欢迎回来' : '私密空间 · 使用 GitHub 验证身份'}
          </div>

          {error && (
            <div role="alert" style={{ fontSize: '12px', color: 'rgba(255,120,120,0.8)', marginBottom: '16px', letterSpacing: '0.05em' }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !checked}
            style={{
              width: '100%',
              background: submitting || !checked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
              color: submitting || !checked ? 'rgba(255,255,255,0.4)' : '#000',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: submitting || !checked ? 'not-allowed' : 'pointer',
              letterSpacing: '0.15em',
              fontFamily: '"Noto Serif SC", serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!submitting && checked) e.currentTarget.style.background = '#fff' }}
            onMouseLeave={e => { if (!submitting && checked) e.currentTarget.style.background = 'rgba(255,255,255,0.9)' }}
          >
            {!checked ? '确认身份中…' : submitting ? (isOwner ? '正在进入…' : '前往 GitHub…') : isOwner ? '进 入' : '使用 GitHub 登录'}
          </button>
        </div>
      )}
    </div>
  )
}
