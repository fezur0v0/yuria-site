'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export default function NotesIntro() {
  const router = useRouter()
  const [lines, setLines] = useState<string[]>([])
  const [phase, setPhase] = useState<'intro' | 'password'>('intro')
  const [currentLine, setCurrentLine] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [particles, setParticles] = useState<{x:number,y:number,size:number,opacity:number,speed:number}[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 已验证过则直接进入
    if (sessionStorage.getItem('notes_auth') === 'true') {
      router.replace('/notes/library')
      return
    }
    fetchData()
    generateParticles()
  }, [])

  function generateParticles() {
    const p = Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 20 + 15,
    }))
    setParticles(p)
  }

  async function fetchData() {
    const [linesRes, qRes] = await Promise.all([
      supabase.from('intro_lines').select('text').order('sort_order'),
      supabase.from('access_config').select('value').eq('key', 'question').single(),
    ])
    if (linesRes.data) setLines(linesRes.data.map((r: any) => r.text))
    if (qRes.data) setQuestion(qRes.data.value)
  }

  // 动画主逻辑
  useEffect(() => {
    if (phase !== 'intro' || lines.length === 0) return
    runLine(0)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [lines, phase])

  function runLine(idx: number) {
    if (idx >= lines.length) {
      timerRef.current = setTimeout(() => setPhase('password'), 600)
      return
    }
    setCurrentLine(idx)
    setOpacity(0)
    timerRef.current = setTimeout(() => {
      setOpacity(1)
      timerRef.current = setTimeout(() => {
        setOpacity(0)
        timerRef.current = setTimeout(() => runLine(idx + 1), 800)
      }, 2200)
    }, 100)
  }

  function skip() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setOpacity(0)
    setTimeout(() => setPhase('password'), 300)
  }

  async function handleSubmit() {
    if (!answer.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/notes-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem('notes_auth', 'true')
        router.replace('/notes/library')
      } else {
        setError('答案不对哦，再想想？')
        setAnswer('')
      }
    } catch {
      setError('网络错误，请重试')
    }
    setSubmitting(false)
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
          <button onClick={skip} style={{
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
              const line = lines[currentLine]
              // 最后一句大字
              const isLast = currentLine === lines.length - 1
              if (isLast) {
                const parts = line.split(' ')
                return (
                  <div>
                    {parts[0] && <div style={{ fontSize: 'clamp(14px,3vw,18px)', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: '12px' }}>{parts[0]}</div>}
                    {parts[1] && <div style={{ fontSize: 'clamp(28px,6vw,48px)', fontWeight: 300, color: '#fff', letterSpacing: '0.15em' }}>{parts[1]}</div>}
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

      {/* 密码验证 */}
      {phase === 'password' && (
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
            {question || '请输入访问密码'}
          </div>

          <input
            type="password"
            value={answer}
            onChange={e => { setAnswer(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="请输入答案..."
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${error ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: '"Noto Serif SC", serif',
              transition: 'border-color 0.2s',
              marginBottom: error ? '10px' : '20px',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.35)'}
            onBlur={e => e.target.style.borderColor = error ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.12)'}
          />

          {error && (
            <div style={{ fontSize: '12px', color: 'rgba(255,120,120,0.8)', marginBottom: '16px', letterSpacing: '0.05em' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !answer.trim()}
            style={{
              width: '100%',
              background: submitting ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
              color: submitting ? 'rgba(255,255,255,0.4)' : '#000',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              letterSpacing: '0.15em',
              fontFamily: '"Noto Serif SC", serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#fff' }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = 'rgba(255,255,255,0.9)' }}
          >
            {submitting ? '验证中...' : '进 入'}
          </button>
        </div>
      )}
    </div>
  )
}
