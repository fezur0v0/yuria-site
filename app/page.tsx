'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── 音乐列表（之后你来填真实链接）──
const TRACKS = [
  { title: '晨雾即兴曲', artist: 'Yuria', src: '', cover: '' },
  { title: '雨中漫步',   artist: 'Yuria', src: '', cover: '' },
]

// ── 图集占位（之后从 Supabase 读取）──
const GALLERY_PREVIEW = [
  { label: '黄昏之光', bg: 'linear-gradient(135deg,#c9d6e8,#8096b8)' },
  { label: '森林系列', bg: 'linear-gradient(135deg,#d8cfe8,#a898c8)' },
  { label: '城市迷雾', bg: 'linear-gradient(135deg,#cce0d4,#8ab89e)' },
  { label: '蓝色调',   bg: 'linear-gradient(135deg,#0047AB,#003280)'  },
]

export default function Home() {
  // ── 密码弹窗 ──
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw]         = useState('')
  const [pwErr, setPwErr]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // ── 音乐播放器 ──
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing,  setPlaying]  = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // ── scroll reveal ──
  useEffect(() => {
    const els = document.querySelectorAll('.sr')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const delay = Number((e.target as HTMLElement).dataset.delay ?? 0)
          setTimeout(() => e.target.classList.add('sr-on'), delay)
        }
      })
    }, { threshold: 0.1 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // ── 音乐控制 ──
  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else         { audioRef.current.play().catch(() => {}); setPlaying(true) }
  }
  function prevTrack() { setTrackIdx(i => (i - 1 + TRACKS.length) % TRACKS.length); setPlaying(false) }
  function nextTrack() { setTrackIdx(i => (i + 1) % TRACKS.length); setPlaying(false) }

  // ── 密码 ──
  function openPw()  { setPwOpen(true); setPw(''); setPwErr(''); setTimeout(() => inputRef.current?.focus(), 120) }
  function closePw() { setPwOpen(false); setPw(''); setPwErr('') }
  function checkPw() {
    if (pw === '1212') { window.location.href = '/theater' }
    else { setPwErr('密码错误，请重试'); setPw('') }
  }

  const track = TRACKS[trackIdx]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600&display=swap');
        html,body { font-family:'Noto Serif SC',serif; background:#f8f8f6; margin:0; padding:0; }

        .sr  { opacity:0; transform:translateY(28px) scale(.98); filter:blur(4px);
               transition:opacity .85s cubic-bezier(.22,1,.36,1),
                          transform .85s cubic-bezier(.22,1,.36,1),
                          filter .85s cubic-bezier(.22,1,.36,1); }
        .sr-on { opacity:1; transform:none; filter:none; }

        @keyframes breathe {
          0%,100% { opacity:.2; transform:scale(.65); }
          50%      { opacity:1;  transform:scale(1.3); }
        }
        .dot  { display:inline-block; width:5px; height:5px; border-radius:50%;
                background:#0047AB; margin:0 6px; vertical-align:middle;
                animation:breathe 2.8s ease-in-out infinite; }
        .dot2 { animation-delay:.95s; }

        .stack { position:relative; width:100%; height:148px; }
        .stack-layer {
          position:absolute; left:5%; width:90%;
          border-radius:12px; overflow:hidden;
          border:2px solid #fff;
          box-shadow:0 2px 12px rgba(0,0,0,.08);
          transition:transform .3s ease;
        }
        .sl3 { top:0;    transform:rotate(-3.5deg); z-index:1; }
        .sl2 { top:8px;  transform:rotate(1.5deg);  z-index:2; }
        .sl1 { top:16px; transform:rotate(0deg);    z-index:3; }
        .gallery-card:hover .sl1 { transform:rotate(0deg) translateY(-4px); }
        .stack-layer .fill { height:110px; width:100%; display:block; }

        @keyframes spin { to { transform:rotate(360deg); } }
        .vinyl { animation:spin 4s linear infinite; animation-play-state:paused; }
        .vinyl.playing { animation-play-state:running; }

        .pw-backdrop { backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); }
      `}</style>

      <audio ref={audioRef} src={track.src} onEnded={nextTrack} />

      <main className="max-w-md mx-auto bg-white min-h-screen pb-36">

        {/* HERO */}
        <div className="relative h-64 overflow-hidden">
          <div className="absolute inset-0"
            style={{ background:'linear-gradient(135deg,#bdd0e8 0%,#96aec8 45%,#7590b4 100%)' }} />
          {/* 上半高透明、下半低透明 */}
          <div className="absolute inset-0" style={{
            background:'linear-gradient(to bottom, rgba(255,255,255,.78) 0%, rgba(255,255,255,.22) 50%, rgba(255,255,255,0) 100%)'
          }} />
          {/* 底部融合 */}
          <div className="absolute bottom-0 left-0 right-0 h-28"
            style={{ background:'linear-gradient(to bottom, transparent, white)' }} />
          <div className="absolute bottom-3 left-0 right-0 text-center z-10">
            <div className="text-[42px] font-light text-gray-800" style={{ letterSpacing:'.18em' }}>Yuria</div>
            <div className="text-[10px] text-gray-400 mt-1" style={{ letterSpacing:'.28em' }}>
              <span className="dot" />我的小小世界<span className="dot dot2" />
            </div>
          </div>
        </div>

        {/* 作品集 */}
        <p className="sr text-[10px] text-gray-400 px-5 pt-7 pb-3" style={{ letterSpacing:'.22em' }}>— 作品集</p>
        <Link href="/portfolio"
          className="sr mx-5 mb-5 block rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-500 group"
          data-delay="0">
          <div className="h-32 flex items-center justify-center relative overflow-hidden"
            style={{ background:'linear-gradient(135deg,#dce6f2 0%,#b0c4dc 100%)' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background:'linear-gradient(135deg,#c8d9ee,#9ab4ce)' }} />
            <span className="relative text-xl font-light tracking-[.22em] text-white drop-shadow-sm">作品集</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm font-semibold tracking-wide text-gray-800">我的作品</span>
            <div className="flex gap-2">
              <span className="text-[10px] px-3 py-1 rounded-full" style={{ background:'#e8eef8', color:'#0047AB' }}>图片</span>
              <span className="text-[10px] px-3 py-1 rounded-full bg-gray-100 text-gray-400">音乐</span>
            </div>
          </div>
        </Link>

        {/* 小剧场 */}
        <p className="sr text-[10px] text-gray-400 px-5 pt-2 pb-3" style={{ letterSpacing:'.22em' }} data-delay="60">— 小剧场</p>
        <button onClick={openPw}
          className="sr mx-5 mb-5 w-[calc(100%-40px)] flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-5 hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-300 group"
          data-delay="80">
          <div className="w-11 h-11 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 text-xl group-hover:scale-110 transition-transform duration-300">🔒</div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold tracking-wide text-gray-800">小剧场</div>
            <div className="text-[11px] text-gray-400 mt-1 tracking-wide">私密空间 · 输入密码访问</div>
          </div>
          <span className="text-gray-300 text-lg group-hover:translate-x-1 transition-transform duration-300">›</span>
        </button>

        {/* 图集 */}
        <p className="sr text-[10px] text-gray-400 px-5 pt-2 pb-3" style={{ letterSpacing:'.22em' }} data-delay="100">— 图集</p>
        <div className="grid grid-cols-2 gap-4 px-5 mb-8">
          {GALLERY_PREVIEW.map((item, i) => (
            <Link key={i} href="/gallery"
              className="gallery-card sr rounded-2xl overflow-visible border border-gray-100 bg-white hover:shadow-lg transition-all duration-500 pb-3"
              data-delay={`${120 + i * 55}`}>
              <div className="stack mt-3 mx-1">
                <div className="stack-layer sl3"><div className="fill" style={{ background:item.bg, opacity:.5 }} /></div>
                <div className="stack-layer sl2"><div className="fill" style={{ background:item.bg, opacity:.72 }} /></div>
                <div className="stack-layer sl1"><div className="fill" style={{ background:item.bg }} /></div>
              </div>
              <div className="px-3 pt-3 text-xs text-gray-500 tracking-wide">{item.label}</div>
            </Link>
          ))}
        </div>

      </main>

      {/* 底部导航 + 音乐播放器 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background:'rgba(255,255,255,.93)', backdropFilter:'blur(18px)',
                 WebkitBackdropFilter:'blur(18px)', borderTop:'1px solid #ebebeb',
                 paddingBottom:'max(14px, env(safe-area-inset-bottom))' }}>
        {/* 迷你播放器 */}
        <div className="max-w-md mx-auto px-5 pt-3 pb-2 flex items-center gap-3 border-b border-gray-50">
          <div className={`vinyl ${playing ? 'playing' : ''} w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center shadow-md`}
            style={{ background:'linear-gradient(135deg,#222,#555)', border:'2px solid white' }}>
            <span className="text-white text-[10px]">♪</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-700 truncate tracking-wide">{track.title}</div>
            <div className="text-[10px] text-gray-400 tracking-wide">{track.artist}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={prevTrack} className="text-gray-400 hover:text-gray-700 transition-colors text-sm w-6 text-center">‹</button>
            <button onClick={togglePlay}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200 flex-shrink-0"
              style={{ background:'#0047AB', color:'white', fontSize:'11px' }}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={nextTrack} className="text-gray-400 hover:text-gray-700 transition-colors text-sm w-6 text-center">›</button>
          </div>
        </div>
        {/* 页面导航 */}
        <div className="max-w-md mx-auto flex justify-around py-2">
          {[
            { href:'/',          label:'主页',  icon:'🏠' },
            { href:'/portfolio', label:'作品集', icon:'🎨' },
            { href:'#',          label:'小剧场', icon:'🎭', lock:true },
            { href:'/gallery',   label:'图集',  icon:'🖼️' },
          ].map(item => item.lock
            ? <button key={item.label} onClick={openPw} className="flex flex-col items-center gap-1 px-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-[9px] text-gray-400 tracking-wide">{item.label}</span>
              </button>
            : <Link key={item.label} href={item.href} className="flex flex-col items-center gap-1 px-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-[9px] text-gray-400 tracking-wide">{item.label}</span>
              </Link>
          )}
        </div>
      </nav>

      {/* 密码弹窗 */}
      {pwOpen && (
        <div className="pw-backdrop fixed inset-0 bg-black/28 z-[200] flex items-center justify-center"
          onClick={closePw}>
          <div className="bg-white/96 rounded-3xl p-8 w-72 text-center"
            style={{ boxShadow:'0 24px 80px rgba(0,71,171,.18)' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-2xl mb-2">🎭</div>
            <div className="text-base font-semibold tracking-widest mb-1 text-gray-800">小剧场</div>
            <div className="text-[11px] text-gray-400 mb-6 tracking-wide">私密空间 · 请输入密码</div>
            <div className="flex justify-center gap-3 mb-4">
              {[0,1,2,3].map(i => (
                <div key={i} className="w-3 h-3 rounded-full border-2 transition-all duration-200"
                  style={{ background: pw.length > i ? '#0047AB':'transparent',
                           borderColor: pw.length > i ? '#0047AB':'#ccc' }} />
              ))}
            </div>
            {pwErr && <p className="text-[11px] text-red-400 mb-3">{pwErr}</p>}
            <input ref={inputRef} type="password" maxLength={4}
              value={pw}
              onChange={e => { setPw(e.target.value); setPwErr('') }}
              onKeyDown={e => e.key === 'Enter' && checkPw()}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center tracking-[.3em] text-sm mb-4 focus:outline-none focus:border-blue-300 transition-colors"
              placeholder="· · · ·"
            />
            <button onClick={checkPw}
              className="w-full rounded-xl py-2.5 text-sm tracking-widest text-white mb-3 transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background:'linear-gradient(135deg,#1a1a1a,#0047AB)' }}>
              进入
            </button>
            <button onClick={closePw} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">取消</button>
          </div>
        </div>
      )}
    </>
  )
}
