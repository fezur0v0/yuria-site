'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

// 你的 GitHub 邮箱 — 只有这个账号登录后才能看到管理入口
const ADMIN_EMAIL = 'fezur0v0@gmail.com'

export default function Home() {
  const router = useRouter()
  const [user, setUser]         = useState<any>(null)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [config, setConfig]     = useState({ cover_url: '', signature: '我的小小世界' })
  const [tracks, setTracks]     = useState<any[]>([])
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying]   = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [pwOpen, setPwOpen]     = useState(false)
  const [pw, setPw]             = useState('')
  const [pwErr, setPwErr]       = useState('')
  const audioRef  = useRef<HTMLAudioElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // ── scroll reveal ──
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

  // ── auth + data ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setUser(u)
      setIsAdmin(u?.email === ADMIN_EMAIL)
    })
    fetchConfig()
    fetchTracks()
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      setIsAdmin(u?.email === ADMIN_EMAIL)
    })
    return () => listener.subscription.unsubscribe()
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
      options: { redirectTo: 'https://www.yuria.xin/auth/callback' },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play().catch(() => {}); setPlaying(true) }
  }

  function openPw()  { setPwOpen(true); setPw(''); setPwErr(''); setTimeout(() => inputRef.current?.focus(), 120) }
  function closePw() { setPwOpen(false); setPw(''); setPwErr('') }
  function checkPw() {
    if (pw === '1212') { closePw(); router.push('/notes') }
    else { setPwErr('密码错误，请重试'); setPw('') }
  }

  const track = tracks[trackIdx]

  // ── nav items ──
  const navItems = [
    { href: '/',          label: '主页',
      icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { href: '/portfolio', label: '作品集',
      icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { href: '/gallery',   label: '图集',
      icon: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600&family=Inter:wght@300;400;500&display=swap');
        html,body{font-family:'Inter',sans-serif;background:#efefed;margin:0;padding:0}

        /* scroll reveal */
        .sr{opacity:0;transform:translateY(26px) scale(.99);filter:blur(3px);
            transition:opacity .9s cubic-bezier(.22,1,.36,1),
                       transform .9s cubic-bezier(.22,1,.36,1),
                       filter .9s cubic-bezier(.22,1,.36,1)}
        .sr.on{opacity:1;transform:none;filter:none}

        /* breathing dot */
        @keyframes br{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:.65;transform:scale(1.15)}}
        .bdot{display:inline-block;width:4px;height:4px;border-radius:50%;
              background:#1a1a1a;margin:0 7px;vertical-align:middle;
              animation:br 3s ease-in-out infinite}
        .bdot2{animation-delay:1s}

        /* vinyl */
        @keyframes vspin{to{transform:rotate(360deg)}}
        .vinyl-spin{animation:vspin 3s linear infinite}

        /* waveform */
        @keyframes wa{0%,100%{height:3px}50%{height:15px}}
        @keyframes wb{0%,100%{height:8px}50%{height:12px}}
        @keyframes wc{0%,100%{height:12px}50%{height:4px}}
        @keyframes wd{0%,100%{height:5px}50%{height:17px}}
        @keyframes we{0%,100%{height:14px}50%{height:3px}}
        .wv-on:nth-child(1){animation:wa .7s ease-in-out infinite}
        .wv-on:nth-child(2){animation:wb .55s ease-in-out infinite .08s}
        .wv-on:nth-child(3){animation:wc .85s ease-in-out infinite .04s}
        .wv-on:nth-child(4){animation:wd .65s ease-in-out infinite .12s}
        .wv-on:nth-child(5){animation:we .75s ease-in-out infinite .06s}

        /* sidebar nav hover */
        .sb-link{position:relative;display:flex;align-items:center;gap:10px;
          padding:9px 14px;border-radius:8px;cursor:pointer;
          color:#606060;font-size:12px;letter-spacing:.1em;
          transition:color .2s,background .2s;text-decoration:none}
        .sb-link:hover{color:#e8e8e6;background:rgba(255,255,255,.07)}
        .sb-bar{position:absolute;left:0;top:50%;transform:translateY(-50%);
          width:2px;height:13px;background:#b0b0b0;border-radius:2px;
          opacity:0;transition:opacity .2s}
        .sb-link:hover .sb-bar{opacity:1}

        /* pw modal */
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .pw-fadein{animation:fadeUp .4s cubic-bezier(.22,1,.36,1)}

        /* portfolio stagger card */
        .p-card{display:grid;border-radius:16px;overflow:hidden;cursor:pointer;
          transition:transform .35s,box-shadow .35s}
        .p-card:hover{transform:translateY(-3px);box-shadow:0 14px 44px rgba(0,0,0,.09)}

        /* gallery stack hover */
        .g-card:hover .g-top{transform:rotate(0deg) translateY(-4px);transition:transform .3s}

        /* mobile bottom nav */
        @media(max-width:768px){
          .sidebar{display:none!important}
          .main-area{margin-left:0!important}
          .mobile-nav{display:flex!important}
          .hero-inner{padding:0 20px 20px!important}
          .hero-name{font-size:38px!important}
          .content-pad{padding-left:20px!important;padding-right:20px!important}
          .p-card{grid-template-columns:1fr 1fr!important;max-width:100%!important}
          .p-thumb{height:130px!important}
          .p-body{padding:14px!important}
          .p-exc{display:none!important}
          .p-name{font-size:14px!important}
          .g-grid{grid-template-columns:1fr 1fr!important}
        }
        @media(min-width:769px){
          .mobile-nav{display:none!important}
        }
      `}</style>

      {track && (
        <audio ref={audioRef} src={track.src}
          onEnded={() => setTrackIdx(i => (i + 1) % tracks.length)} />
      )}

      <div style={{display:'flex',minHeight:'100vh'}}>

        {/* ════════════════════════════════
            LEFT SIDEBAR
        ════════════════════════════════ */}
        <aside className="sidebar" style={{
          position:'fixed',left:0,top:0,bottom:0,width:'192px',
          background:'rgba(22,22,22,.86)',
          backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',
          display:'flex',flexDirection:'column',
          paddingTop:'44px',paddingBottom:'28px',
          zIndex:50,boxShadow:'4px 0 40px rgba(0,0,0,.10)',
        }}>
          {/* logo */}
          <div style={{
            fontFamily:'Noto Serif SC,serif',fontSize:'21px',fontWeight:300,
            letterSpacing:'.2em',color:'#f0f0ee',
            padding:'0 24px',marginBottom:'48px',
          }}>Yuria</div>

          {/* nav links */}
          <nav style={{flex:1,display:'flex',flexDirection:'column',gap:'2px',padding:'0 12px'}}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className="sb-link">
                <div className="sb-bar"/>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{flexShrink:0}}>
                  <path d={item.icon}/>
                </svg>
                <span>{item.label}</span>
              </Link>
            ))}
            {/* 小剧场 */}
            <button onClick={openPw} className="sb-link"
              style={{background:'transparent',border:'none',fontFamily:'Inter,sans-serif',textAlign:'left',width:'100%'}}>
              <div className="sb-bar"/>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{flexShrink:0}}>
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <span>小剧场</span>
            </button>
          </nav>

          {/* 底部：设置 / 登录 */}
          <div style={{padding:'0 12px',borderTop:'0.5px solid rgba(255,255,255,.07)',paddingTop:'16px',marginTop:'8px'}}>
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="sb-link" style={{marginBottom:'2px'}}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="2" stroke="#888" strokeWidth="1"/>
                      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
                        stroke="#888" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                    <span style={{fontSize:'11px',letterSpacing:'.1em'}}>设置</span>
                  </Link>
                )}
                <button onClick={signOut} className="sb-link"
                  style={{background:'transparent',border:'none',fontFamily:'Inter,sans-serif',textAlign:'left',width:'100%'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  <span style={{fontSize:'11px',letterSpacing:'.1em'}}>退出</span>
                </button>
              </>
            ) : (
              <button onClick={signInWithGitHub} className="sb-link"
                style={{background:'transparent',border:'none',fontFamily:'Inter,sans-serif',textAlign:'left',width:'100%'}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="2" stroke="#888" strokeWidth="1"/>
                  <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
                    stroke="#888" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <span style={{fontSize:'11px',letterSpacing:'.1em'}}>设置</span>
              </button>
            )}
          </div>
        </aside>

        {/* ════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════ */}
        <main className="main-area" style={{marginLeft:'192px',flex:1,background:'#fafaf8',minHeight:'100vh',paddingBottom:'80px'}}>

          {/* ── HERO ── */}
          <div style={{position:'relative',height:'420px',overflow:'hidden'}}>
            {config.cover_url
              ? <img src={config.cover_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} alt="cover"/>
              : <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,#b8c4d0,#90a0b0 45%,#687888)'}}/>
            }
            {/* 顶部透明→底部白色 */}
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(250,250,248,0) 0%,rgba(250,250,248,0) 15%,rgba(250,250,248,.06) 35%,rgba(250,250,248,.32) 56%,rgba(250,250,248,.78) 78%,rgba(250,250,248,1) 100%)'}}/>
            <div className="hero-inner" style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 52px 24px',zIndex:2}}>
              <div className="hero-name" style={{fontFamily:'Noto Serif SC,serif',fontSize:'56px',fontWeight:300,letterSpacing:'.16em',color:'#1a1a1a',lineHeight:1}}>
                Yuria
              </div>
              <div style={{fontSize:'11px',color:'#999',letterSpacing:'.3em',marginTop:'8px'}}>
                <span className="bdot"/>{config.signature}<span className="bdot bdot2"/>
              </div>
            </div>
          </div>

          {/* ── MUSIC PLAYER ── */}
          {tracks.length > 0 && (
            <div className="sr content-pad" style={{padding:'0 52px'}} data-d="0">
              <div style={{borderBottom:'0.5px solid rgba(0,0,0,.06)'}}>
                {/* main bar */}
                <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 0',cursor:'pointer'}}
                  onClick={() => setListOpen(o => !o)}>

                  {/* vinyl */}
                  <div className={playing ? 'vinyl-spin' : ''} style={{
                    width:'38px',height:'38px',borderRadius:'50%',flexShrink:0,
                    background:'linear-gradient(135deg,#1a1a1a,#3a3a3a)',position:'relative',
                  }}>
                    {track?.cover_url && (
                      <img src={track.cover_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover',opacity:.6}} alt=""/>
                    )}
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:'34%',height:'34%',borderRadius:'50%',background:'#fafaf8'}}/>
                    </div>
                  </div>

                  {/* info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:500,color:'#1a1a1a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track?.title}</div>
                    <div style={{fontSize:'10px',color:'#999',marginTop:'2px'}}>{track?.artist}</div>
                  </div>

                  {/* waveform */}
                  <div style={{display:'flex',alignItems:'flex-end',gap:'2.5px',height:'18px',flexShrink:0}}>
                    {[5,10,7,14,8].map((h, i) => (
                      <div key={i} className={playing ? 'wv-on' : ''}
                        style={{width:'2px',borderRadius:'2px',
                          background: playing ? '#333':'#d0d0d0',
                          height:`${h}px`,transition:'background .2s'}}/>
                    ))}
                  </div>

                  {/* controls */}
                  <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                    {/* prev */}
                    <button onClick={e => { e.stopPropagation(); setTrackIdx(i => (i-1+tracks.length)%tracks.length); setPlaying(false) }}
                      style={{width:'30px',height:'30px',borderRadius:'50%',border:'1px solid #d0d0ce',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'border-color .2s'}}
                      onMouseEnter={e => (e.currentTarget.style.borderColor='#888')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor='#d0d0ce')}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M9.5 2.5L5.5 6l4 3.5V2.5z" fill="#555"/>
                        <rect x="2" y="2.5" width="1.5" height="7" rx=".75" fill="#555"/>
                      </svg>
                    </button>
                    {/* play/pause */}
                    <button onClick={e => { e.stopPropagation(); togglePlay() }}
                      style={{width:'30px',height:'30px',borderRadius:'50%',background:'#1a1a1a',border:'1px solid #1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'background .2s'}}
                      onMouseEnter={e => (e.currentTarget.style.background='#333')}
                      onMouseLeave={e => (e.currentTarget.style.background='#1a1a1a')}>
                      {playing
                        ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="3" y="2.5" width="2" height="7" rx="1" fill="#fff"/><rect x="7" y="2.5" width="2" height="7" rx="1" fill="#fff"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.5 2.5l6 3.5-6 3.5V2.5z" fill="#fff"/></svg>
                      }
                    </button>
                    {/* next */}
                    <button onClick={e => { e.stopPropagation(); setTrackIdx(i => (i+1)%tracks.length); setPlaying(false) }}
                      style={{width:'30px',height:'30px',borderRadius:'50%',border:'1px solid #d0d0ce',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'border-color .2s'}}
                      onMouseEnter={e => (e.currentTarget.style.borderColor='#888')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor='#d0d0ce')}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 2.5L6.5 6l-4 3.5V2.5z" fill="#555"/>
                        <rect x="8.5" y="2.5" width="1.5" height="7" rx=".75" fill="#555"/>
                      </svg>
                    </button>
                  </div>

                  {/* expand */}
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{flexShrink:0,transition:'transform .3s',transform:listOpen?'rotate(180deg)':'none'}}>
                    <path d="M2 4.5l4.5 4.5 4.5-4.5" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* track list */}
                <div style={{maxHeight:listOpen?'200px':'0',overflow:'hidden',transition:'max-height .4s cubic-bezier(.22,1,.36,1)'}}>
                  {tracks.map((t, i) => (
                    <div key={t.id} onClick={() => { setTrackIdx(i); if (!playing) togglePlay() }}
                      style={{display:'flex',alignItems:'center',gap:'12px',padding:'9px 0',borderTop:'0.5px solid #f0f0ee',cursor:'pointer',transition:'background .15s',borderRadius:'4px'}}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#f5f5f3'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                      <span style={{fontSize:'10px',color:'#ccc',width:'16px',textAlign:'center',flexShrink:0}}>{i+1}</span>
                      <span style={{fontSize:'12px',color:'#888',flex:1}}>{t.title}</span>
                      <span style={{fontSize:'10px',color:'#bbb'}}>{t.artist}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PORTFOLIO ── */}
          <div className="sr content-pad" style={{padding:'44px 52px 0'}} data-d="60">
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'24px'}}>
              <span style={{fontSize:'10px',letterSpacing:'.3em',color:'#aaa'}}>PORTFOLIO</span>
              <Link href="/portfolio" style={{fontSize:'11px',color:'#aaa',display:'flex',alignItems:'center',gap:'3px',transition:'color .2s',textDecoration:'none'}}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='#1a1a1a'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='#aaa'}>
                全部
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </Link>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              {[
                {rev:false, bg:'linear-gradient(160deg,#8a9aaa,#5a6a7a)', tag:'PHOTOGRAPHY · 2025', name:'秋日系列', excerpt:'光影交错的午后，城市在镜头里变得温柔而遥远…'},
                {rev:true,  bg:'linear-gradient(160deg,#9898aa,#686878)', tag:'ILLUSTRATION · 2025', name:'城市素描', excerpt:'用线条描绘城市的轮廓，每一笔都是对空间的感知…'},
              ].map((item, i) => (
                <div key={i} className="sr p-card"
                  style={{gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',maxWidth:'680px'}}
                  data-d={`${80+i*60}`}>
                  <div style={{order:item.rev?2:1,height:'188px',background:item.bg}}/>
                  <div style={{order:item.rev?1:2,background:'#f4f4f2',padding:'28px',display:'flex',flexDirection:'column',justifyContent:'center',gap:'8px'}}>
                    <div style={{fontSize:'9px',letterSpacing:'.2em',color:'#aaa'}}>{item.tag}</div>
                    <div className="p-name" style={{fontFamily:'Noto Serif SC,serif',fontSize:'18px',fontWeight:300,letterSpacing:'.08em',color:'#1a1a1a'}}>{item.name}</div>
                    <div className="p-exc" style={{fontSize:'11px',color:'#999',lineHeight:1.9}}>{item.excerpt}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── GALLERY ── */}
          <div className="sr content-pad" style={{padding:'44px 52px 0'}} data-d="100">
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'24px'}}>
              <span style={{fontSize:'10px',letterSpacing:'.3em',color:'#aaa'}}>GALLERY</span>
              <Link href="/gallery" style={{fontSize:'11px',color:'#aaa',display:'flex',alignItems:'center',gap:'3px',transition:'color .2s',textDecoration:'none'}}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='#1a1a1a'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='#aaa'}>
                全部
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </Link>
            </div>
            <div className="g-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
              {[
                {label:'黄昏之光',count:'12 张',bg:'linear-gradient(150deg,#aab0ba,#7a8090)'},
                {label:'森林系列',count:'8 张', bg:'linear-gradient(150deg,#bcb8c8,#8a8898)'},
                {label:'城市迷雾',count:'16 张',bg:'linear-gradient(150deg,#b4bcb8,#848c88)'},
                {label:'黑白系列',count:'9 张', bg:'linear-gradient(150deg,#484848,#1a1a1a)'},
              ].map((item, i) => (
                <Link key={i} href="/gallery" className="g-card sr"
                  style={{cursor:'pointer',transition:'transform .35s',textDecoration:'none',display:'block'}}
                  data-d={`${110+i*38}`}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='translateY(-3px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform='none'}>
                  <div style={{position:'relative',height:'128px',margin:'4px'}}>
                    {[
                      {rot:'-3.2deg',op:.45,top:0},
                      {rot:'1.5deg', op:.7, top:8},
                      {rot:'0deg',   op:1,  top:16},
                    ].map((l,j) => (
                      <div key={j} className={j===2?'g-top':''} style={{
                        position:'absolute',left:'4%',width:'92%',top:`${l.top}px`,
                        transform:`rotate(${l.rot})`,zIndex:j+1,
                        borderRadius:'8px',overflow:'hidden',
                        border:'2px solid #fff',
                        boxShadow:`0 ${2+j*2}px ${8+j*4}px rgba(0,0,0,${.06+j*.015})`,
                      }}>
                        <div style={{height:'82px',background:item.bg,opacity:l.op}}/>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:'11px',color:'#888',padding:'6px 2px 0'}}>{item.label}</div>
                  <div style={{fontSize:'10px',color:'#bbb',marginTop:'2px'}}>{item.count}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── 小剧场 ── */}
          <div className="sr content-pad" style={{padding:'44px 52px 0'}} data-d="140">
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'24px'}}>
              <span style={{fontSize:'10px',letterSpacing:'.3em',color:'#aaa'}}>小剧场</span>
            </div>
            <button onClick={openPw} style={{
              width:'100%',maxWidth:'680px',display:'flex',alignItems:'center',gap:'16px',
              padding:'20px 22px',borderRadius:'16px',
              background:'rgba(26,26,26,.04)',border:'0.5px solid rgba(0,0,0,.06)',
              cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'background .2s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(26,26,26,.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='rgba(26,26,26,.04)'}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'rgba(26,26,26,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div style={{flex:1,textAlign:'left'}}>
                <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'14px',fontWeight:300,letterSpacing:'.1em',color:'#1a1a1a'}}>小剧场</div>
                <div style={{fontSize:'11px',color:'#aaa',marginTop:'3px'}}>私密空间 · 输入密码访问</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

        </main>
      </div>

      {/* ════════════════════════════════
          MOBILE BOTTOM NAV
      ════════════════════════════════ */}
      <nav className="mobile-nav" style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:50,
        background:'rgba(255,255,255,.93)',
        backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',
        borderTop:'0.5px solid #f0f0f0',
        paddingBottom:'max(14px,env(safe-area-inset-bottom))',
      }}>
        <div style={{display:'flex',justifyContent:'space-around',paddingTop:'10px'}}>
          {[
            {href:'/',label:'主页',path:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z'},
            {href:'/portfolio',label:'作品集',path:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'},
            {href:'/gallery',label:'图集',path:'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18'},
          ].map(item => (
            <Link key={item.href} href={item.href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',color:'#aaa',textDecoration:'none',padding:'0 12px',transition:'color .2s'}}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='#1a1a1a'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='#aaa'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.path}/>
              </svg>
              <span style={{fontSize:'9px',letterSpacing:'.1em'}}>{item.label}</span>
            </Link>
          ))}
          <button onClick={openPw} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',color:'#aaa',background:'none',border:'none',cursor:'pointer',padding:'0 12px',transition:'color .2s'}}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='#1a1a1a'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='#aaa'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <span style={{fontSize:'9px',letterSpacing:'.1em'}}>小剧场</span>
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════
          PASSWORD MODAL
      ════════════════════════════════ */}
      {pwOpen && (
        <div style={{
          position:'fixed',inset:0,zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:'rgba(18,18,18,.5)',
          backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',
        }} onClick={closePw}>
          <div className="pw-fadein" style={{
            background:'rgba(252,252,250,.97)',borderRadius:'20px',
            padding:'40px 36px',width:'300px',textAlign:'center',
            boxShadow:'0 32px 80px rgba(0,0,0,.16)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'16px',fontWeight:300,letterSpacing:'.15em',marginBottom:'4px'}}>小剧场</div>
            <div style={{fontSize:'11px',color:'#aaa',letterSpacing:'.1em',marginBottom:'28px'}}>私密空间 · 请输入密码</div>
            {/* dots */}
            <div style={{display:'flex',justifyContent:'center',gap:'10px',marginBottom:'18px'}}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width:'8px',height:'8px',borderRadius:'50%',
                  border:'0.5px solid',
                  transition:'all .2s',
                  background:pw.length>i?'#1a1a1a':'transparent',
                  borderColor:pw.length>i?'#1a1a1a':'#ddd',
                }}/>
              ))}
            </div>
            {pwErr && <p style={{fontSize:'11px',color:'#c0392b',marginBottom:'8px'}}>{pwErr}</p>}
            <input ref={inputRef} type="password" maxLength={4} value={pw}
              onChange={e => { setPw(e.target.value); setPwErr('') }}
              onKeyDown={e => e.key==='Enter' && checkPw()}
              style={{
                width:'100%',border:'0.5px solid #e0e0e0',borderRadius:'12px',
                padding:'11px',textAlign:'center',letterSpacing:'.3em',fontSize:'14px',
                marginBottom:'16px',background:'transparent',color:'#1a1a1a',
                outline:'none',fontFamily:'Inter,sans-serif',
              }}
              placeholder=""
            />
            <button onClick={checkPw} style={{
              width:'100%',background:'#1a1a1a',color:'#fff',border:'none',
              borderRadius:'12px',padding:'11px',fontSize:'12px',
              letterSpacing:'.18em',cursor:'pointer',marginBottom:'12px',
              fontFamily:'Inter,sans-serif',transition:'opacity .2s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity='.85'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity='1'}>
              进 入
            </button>
            <button onClick={closePw} style={{
              fontSize:'11px',color:'#bbb',cursor:'pointer',
              background:'none',border:'none',fontFamily:'Inter,sans-serif',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color='#666'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color='#bbb'}>
              取消
            </button>
          </div>
        </div>
      )}
    </>
  )
}
