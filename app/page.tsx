'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [config, setConfig] = useState({ cover_url: '', signature: '我的小小世界' })
  const [tracks, setTracks] = useState<any[]>([])
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [loopMode, setLoopMode] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchConfig()
    fetchTracks()
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('.sr')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const d = Number((e.target as HTMLElement).dataset.d ?? 0)
          setTimeout(() => e.target.classList.add('on'), d)
        }
      })
    }, { threshold: 0.08 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  async function fetchConfig() {
    const { data } = await supabase.from('site_config').select('*')
    if (data) {
      const map: any = {}
      data.forEach((r: any) => { map[r.key] = r.value })
      setConfig({ cover_url: map.cover_url ?? '', signature: map.signature ?? '我的小小世界' })
    }
  }

  async function fetchTracks() {
    const { data } = await supabase.from('music_tracks').select('*').order('sort_order')
    setTracks(data || [])
  }

  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: 'https://www.yuria.xin/auth/callback' }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setPlaying(true)
    }
  }

  function nextTrack() {
    setTrackIdx(prev => (prev + 1) % tracks.length)
    if (playing) {
      // 播放下一首时自动保持播放
      setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
    }
  }

  function prevTrack() {
    setTrackIdx(prev => (prev - 1 + tracks.length) % tracks.length)
    if (playing) {
      setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
    }
  }

  function openPw() { setPwOpen(true); setPw(''); setPwErr(''); setTimeout(() => inputRef.current?.focus(), 120) }
  function closePw() { setPwOpen(false); setPw(''); setPwErr('') }
  function checkPw() {
    if (pw === '1212') { window.location.href = '/theater' }
    else { setPwErr('密码错误，请重试'); setPw('') }
  }

  const track = tracks[trackIdx]

  // 音乐播放结束自动下一首
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handleEnded = () => {
      if (loopMode) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        nextTrack()
      }
    }
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [loopMode, nextTrack])

  // 切换歌曲时更新audio src
  useEffect(() => {
    if (track && audioRef.current) {
      const shouldPlay = playing
      audioRef.current.src = track.src
      if (shouldPlay) {
        audioRef.current.play().catch(() => setPlaying(false))
      }
    }
  }, [track])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600&family=Inter:wght@300;400;500;600&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', 'Noto Serif SC', sans-serif;
          background: #f2f2ef;
          color: #1a1a1a;
        }
        
        /* 滚动入场动画 */
        .sr {
          opacity: 0;
          transform: translateY(24px);
          filter: blur(3px);
          transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.9s cubic-bezier(0.22, 1, 0.36, 1),
                      filter 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sr.on {
          opacity: 1;
          transform: none;
          filter: none;
        }
        
        /* 动态圆点 */
        .bdot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #1a1a1a;
          margin: 0 6px;
          vertical-align: middle;
          animation: br 2.8s ease-in-out infinite;
        }
        .bdot2 { animation-delay: 0.9s; }
        @keyframes br {
          0%, 100% { opacity: 0.15; transform: scale(0.6); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        
        /* 黑胶动画 */
        @keyframes vspin {
          to { transform: rotate(360deg); }
        }
        .vinyl-playing {
          animation: vspin 3s linear infinite;
        }
        
        /* 波形动画 */
        @keyframes w1 { 0%,100%{ height: 4px } 50%{ height: 16px } }
        @keyframes w2 { 0%,100%{ height: 9px } 50%{ height: 13px } }
        @keyframes w3 { 0%,100%{ height: 13px } 50%{ height: 5px } }
        @keyframes w4 { 0%,100%{ height: 6px } 50%{ height: 18px } }
        @keyframes w5 { 0%,100%{ height: 15px } 50%{ height: 4px } }
        .wv-play:nth-child(1) { animation: w1 0.7s ease-in-out infinite; }
        .wv-play:nth-child(2) { animation: w2 0.5s ease-in-out infinite 0.1s; }
        .wv-play:nth-child(3) { animation: w3 0.8s ease-in-out infinite 0.05s; }
        .wv-play:nth-child(4) { animation: w4 0.6s ease-in-out infinite 0.15s; }
        .wv-play:nth-child(5) { animation: w5 0.75s ease-in-out infinite 0.08s; }
      `}</style>

      {track && <audio ref={audioRef} />}

      <main className="max-w-3xl mx-auto bg-white min-h-screen pb-32" style={{ boxShadow: '0 0 40px rgba(0,0,0,0.02)' }}>

        {/* Hero 区域 */}
        <div className="relative h-80 overflow-hidden">
          {config.cover_url ? (
            <img src={config.cover_url} className="absolute inset-0 w-full h-full object-cover" alt="cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #b0b8c4, #848e9a 50%, #5a6370)' }} />
          )}
          {/* 渐变遮罩：上透明 → 下白色 */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.7) 72%, #ffffff 100%)'
          }} />
          <div className="absolute bottom-0 left-0 right-0 px-12 pb-7 flex items-end justify-between z-10">
            <div>
              <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: '52px', fontWeight: 300, letterSpacing: '.14em', lineHeight: 1, color: '#1a1a1a' }}>
                Yuria
              </div>
              <div style={{ fontSize: '11px', color: '#888', letterSpacing: '.28em', marginTop: '8px' }}>
                <span className="bdot" />
                {config.signature}
                <span className="bdot bdot2" />
              </div>
            </div>
            {/* 管理员按钮 */}
            {user ? (
              <div className="flex gap-2 items-center">
                <Link
                  href="/admin"
                  className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-400 transition-colors"
                  style={{ background: 'rgba(255,255,255,.8)' }}
                >
                  管理
                </Link>
                <button
                  onClick={signOut}
                  className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-400 transition-colors"
                  style={{ background: 'rgba(255,255,255,.8)' }}
                >
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGitHub}
                className="text-xs text-gray-400 border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-400 transition-colors"
                style={{ background: 'rgba(255,255,255,.8)' }}
              >
                登录
              </button>
            )}
          </div>
        </div>

        {/* 音乐播放器 */}
        {tracks.length > 0 && (
          <div className="sr px-12" data-d="0">
            <div
              className="flex items-center gap-3 py-3 cursor-pointer border-b border-gray-50"
              onClick={() => setListOpen(o => !o)}
            >
              {/* 黑胶唱片 */}
              <div
                className={`w-9 h-9 rounded-full flex-shrink-0 relative ${playing ? 'vinyl-playing' : ''}`}
                style={{ background: 'linear-gradient(135deg, #1a1a1a, #444)' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
                {track?.cover_url && (
                  <img src={track.cover_url} className="absolute inset-0 w-full h-full rounded-full object-cover opacity-60" alt="" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">{track?.title ?? '暂无音乐'}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{track?.artist ?? ''}</div>
              </div>
              {/* 动态波形 */}
              <div className="flex gap-1.5 items-center flex-shrink-0">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-sm bg-gray-300 ${playing ? 'wv-play' : ''} ${playing ? 'bg-gray-800' : ''}`}
                    style={{ height: playing ? undefined : `${[5, 10, 7, 13, 6][i]}px` }}
                  />
                ))}
              </div>
              {/* 控制按钮组 */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  onClick={e => { e.stopPropagation(); prevTrack() }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M8 2L4 5l4 3V2zM2 2h1v6H2V2z" fill="#555" />
                  </svg>
                </button>
                <button
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                  onClick={e => { e.stopPropagation(); togglePlay() }}
                >
                  {playing ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="2" y="2" width="2.5" height="6" rx="1" fill="#1a1a1a" />
                      <rect x="5.5" y="2" width="2.5" height="6" rx="1" fill="#1a1a1a" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 2l5 3-5 3V2z" fill="#1a1a1a" />
                    </svg>
                  )}
                </button>
                <button
                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  onClick={e => { e.stopPropagation(); nextTrack() }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l4 3-4 3V2zM7 2h1v6H7V2z" fill="#555" />
                  </svg>
                </button>
                <button
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${loopMode ? 'border-gray-400 bg-gray-100' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={e => { e.stopPropagation(); setLoopMode(m => !m) }}
                >
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M2 8.5A4 4 0 0010 10m0 0l-2-2m2 2l-2 2M12 5.5A4 4 0 004 4m0 0l2 2M4 4l2-2" stroke={loopMode ? '#1a1a1a' : '#999'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              {/* 展开箭头 */}
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                className="flex-shrink-0 text-gray-300"
                style={{ transform: listOpen ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }}
              >
                <path d="M2 4l4 4 4-4" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* 曲目列表 */}
            <div style={{
              maxHeight: listOpen ? '240px' : '0',
              overflow: 'hidden',
              transition: 'max-height .4s cubic-bezier(0.22, 1, 0.36, 1)'
            }}>
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 py-2.5 border-t border-gray-50 cursor-pointer hover:bg-gray-50 px-1 -mx-1 rounded"
                  onClick={() => {
                    setTrackIdx(i)
                    if (!playing) {
                      setTimeout(() => togglePlay(), 50)
                    } else {
                      // 切换歌曲后自动播放
                      setTimeout(() => audioRef.current?.play().catch(() => {}), 50)
                    }
                  }}
                >
                  <span className="text-[10px] text-gray-300 w-4 text-center">{i + 1}</span>
                  <span className="text-xs text-gray-600 flex-1">{t.title}</span>
                  <span className="text-[10px] text-gray-300">{t.artist}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 作品集区域 */}
        <div className="sr px-12 pt-10" data-d="60">
          <div className="flex items-baseline justify-between mb-5">
            <span style={{ fontSize: '10px', letterSpacing: '.3em', color: '#aaa' }}>PORTFOLIO</span>
            <Link href="/portfolio" className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-700 transition-colors">
              全部
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="sr rounded-xl overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-transform duration-300" data-d="80">
              <div className="h-36 flex items-end p-3" style={{ background: 'linear-gradient(160deg, #8a9aaa, #5a6a7a)' }}>
                <span style={{ fontFamily: 'Noto Serif SC, serif', fontSize: '13px', fontWeight: 300, letterSpacing: '.15em', color: 'rgba(255,255,255,.9)' }}>秋日系列</span>
              </div>
              <div className="px-3 py-2.5 bg-gray-50">
                <div className="text-xs font-medium text-gray-800">秋日摄影</div>
                <div className="text-[10px] text-gray-400 mt-0.5">图片 · 2025</div>
              </div>
            </div>
            <div className="sr rounded-xl overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-transform duration-300" data-d="130">
              <div className="h-36 flex items-end p-3" style={{ background: 'linear-gradient(160deg, #9898aa, #686878)' }}>
                <span style={{ fontFamily: 'Noto Serif SC, serif', fontSize: '13px', fontWeight: 300, letterSpacing: '.15em', color: 'rgba(255,255,255,.9)' }}>城市素描</span>
              </div>
              <div className="px-3 py-2.5 bg-gray-50">
                <div className="text-xs font-medium text-gray-800">插画系列</div>
                <div className="text-[10px] text-gray-400 mt-0.5">插画 · 2025</div>
              </div>
            </div>
          </div>
        </div>

        {/* 图集区域 */}
        <div className="sr px-12 pt-9" data-d="100">
          <div className="flex items-baseline justify-between mb-5">
            <span style={{ fontSize: '10px', letterSpacing: '.3em', color: '#aaa' }}>GALLERY</span>
            <Link href="/gallery" className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-700 transition-colors">
              全部
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '黄昏之光', bg: 'linear-gradient(150deg,#aab0ba,#7a8090)' },
              { label: '森林系列', bg: 'linear-gradient(150deg,#bcb8c8,#8a8898)' },
              { label: '城市迷雾', bg: 'linear-gradient(150deg,#b4bcb8,#848c88)' },
              { label: '黑白系列', bg: 'linear-gradient(150deg,#555,#222)' },
            ].map((item, i) => (
              <Link
                key={i}
                href="/gallery"
                className="sr cursor-pointer hover:-translate-y-0.5 transition-transform duration-300"
                data-d={`${120 + i * 35}`}
              >
                <div className="relative h-24">
                  {[
                    { rot: '-3deg', op: 0.45, z: 1 },
                    { rot: '1.5deg', op: 0.7, z: 2 },
                    { rot: '0', op: 1, z: 3 }
                  ].map((l, j) => (
                    <div
                      key={j}
                      className="absolute rounded-lg overflow-hidden border-2 border-white"
                      style={{ left: '5%', width: '90%', top: `${j * 6}px`, transform: `rotate(${l.rot})`, zIndex: l.z }}
                    >
                      <div style={{ height: '62px', background: item.bg, opacity: l.op }} />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mt-1.5 px-0.5 text-center">{item.label}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* 小剧场入口 */}
        <div className="sr px-12 pt-9 pb-4" data-d="140">
          <div className="flex items-baseline justify-between mb-5">
            <span style={{ fontSize: '10px', letterSpacing: '.3em', color: '#aaa' }}>小剧场</span>
          </div>
          <button
            onClick={openPw}
            className="w-full flex items-center gap-4 rounded-xl bg-gray-50 px-5 py-4 hover:bg-gray-100 transition-colors duration-200 group"
          >
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-300 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#666" strokeWidth="1.2" />
                <path d="M5 6V4.5a2 2 0 014 0V6" stroke="#666" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-800 tracking-wide">小剧场</div>
              <div className="text-xs text-gray-400 mt-0.5">私密空间 · 输入密码访问</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-300 group-hover:translate-x-0.5 transition-transform">
              <path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </main>

      {/* 底部导航栏 - 手机端适配 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center"
        style={{
          background: 'rgba(255,255,255,.93)',
          backdropFilter: 'blur(18px)',
          borderTop: '0.5px solid #f0f0f0',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="w-full max-w-3xl flex justify-around py-2.5">
          <Link href="/" className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-700 transition-colors px-4">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 8l7-6 7 6v8H11v-4H7v4H2V8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            <span className="text-[9px] tracking-widest">主页</span>
          </Link>
          <Link href="/portfolio" className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-700 transition-colors px-4">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="text-[9px] tracking-widest">作品集</span>
          </Link>
          <Link href="/gallery" className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-700 transition-colors px-4">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 12l4-3 3 3 2-2 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            <span className="text-[9px] tracking-widest">图集</span>
          </Link>
          <button onClick={openPw} className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-700 transition-colors px-4">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="8" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M6 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="text-[9px] tracking-widest">小剧场</span>
          </button>
        </div>
      </nav>

      {/* 密码弹窗 - 高级ins风格 */}
      {pwOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(10px)' }}
          onClick={closePw}
        >
          <div
            className="bg-white rounded-2xl p-8 text-center"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,.15)', width: '280px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'Noto Serif SC, serif', fontSize: '15px', fontWeight: 300, letterSpacing: '.15em', marginBottom: '4px' }}>小剧场</div>
            <div className="text-xs text-gray-400 mb-6 tracking-wide">私密空间 · 请输入密码</div>
            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full border transition-all duration-200"
                  style={{
                    background: pw.length > i ? '#1a1a1a' : 'transparent',
                    borderColor: pw.length > i ? '#1a1a1a' : '#ddd'
                  }}
                />
              ))}
            </div>
            {pwErr && <p className="text-xs text-red-400 mb-3">{pwErr}</p>}
            <input
              ref={inputRef}
              type="password"
              maxLength={4}
              value={pw}
              onChange={e => { setPw(e.target.value); setPwErr('') }}
              onKeyDown={e => e.key === 'Enter' && checkPw()}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center tracking-widest text-sm mb-4 focus:outline-none focus:border-gray-400 transition-colors"
              placeholder="· · · ·"
            />
            <button
              onClick={checkPw}
              className="w-full rounded-xl py-2.5 text-sm tracking-widest text-white mb-3 hover:opacity-90 active:scale-95 transition-all"
              style={{ background: '#1a1a1a' }}
            >
              进入
            </button>
            <button onClick={closePw} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              取消
            </button>
          </div>
        </div>
      )}
    </>
  )
}
