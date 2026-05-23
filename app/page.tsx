'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
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
  const [checking, setChecking] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setUser(null); setIsAdmin(false)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play().catch(() => {}); setPlaying(true) }
  }

  function openPw() { setPwOpen(true); setPw(''); setPwErr(''); setTimeout(() => inputRef.current?.focus(), 120) }
  function closePw() { setPwOpen(false); setPw(''); setPwErr('') }

  // 密码验证在服务端进行，不暴露在前端
  async function checkPw() {
    if (!pw.trim()) return
    setChecking(true)
    try {
      const { data } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'theater_password')
        .single()
      if (data?.value === pw) {
        closePw()
        router.push('/notes')
      } else {
        setPwErr('密码错误，请重试')
        setPw('')
      }
    } catch {
      setPwErr('验证失败，请重试')
    } finally {
      setChecking(false)
    }
  }

  const track = tracks[trackIdx]

  const navItems = [
    { href: '/', label: '主页', d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
    { href: '/portfolio', label: '作品集', d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { href: '/gallery', label: '图集', d: 'M4 16l4-8 4 8M2 12h12M16 6h.01M16 10a4 4 0 110-8 4 4 0 010 8z' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600&family=Inter:wght@300;400;500&display=swap');
        *{box-sizing:border-box}
        html,body{font-family:'Inter',sans-serif;background:#efefed;margin:0;padding:0}
        .sr{opacity:0;transform:translateY(26px) scale(.99);filter:blur(3px);
            transition:opacity .9s cubic-bezier(.22,1,.36,1),transform .9s cubic-bezier(.22,1,.36,1),filter .9s cubic-bezier(.22,1,.36,1)}
        .sr.on{opacity:1;transform:none;filter:none}
        @keyframes br{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:.65;transform:scale(1.15)}}
        .bdot{display:inline-block;width:4px;height:4px;border-radius:50%;background:#1a1a1a;margin:0 7px;vertical-align:middle;animation:br 3s ease-in-out infinite}
        .bdot2{animation-delay:1s}
        @keyframes vspin{to{transform:rotate(360deg)}}
        .vinyl-spin{animation:vspin 3s linear infinite}
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
        .sb-link{position:relative;display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:8px;cursor:pointer;color:#5a5a5a;font-size:13px;letter-spacing:.08em;transition:color .2s,background .2s;text-decoration:none;border:none;font-family:'Inter',sans-serif;text-align:left;width:100%}
        .sb-link:hover{color:#e8e8e6;background:rgba(255,255,255,.07)}
        .sb-bar{position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:14px;background:#b0b0b0;border-radius:2px;opacity:0;transition:opacity .2s}
        .sb-link:hover .sb-bar{opacity:1}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .pw-fadein{animation:fadeUp .4s cubic-bezier(.22,1,.36,1)}
        .hover-lift{transition:transform .3s,box-shadow .3s}
        .hover-lift:hover{transform:translateY(-3px);box-shadow:0 14px 44px rgba(0,0,0,.09)}

        /* Desktop layout */
        .layout{display:flex;min-height:100vh}
        .sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;background:rgba(20,20,20,.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);display:flex;flex-direction:column;padding:48px 0 32px;z-index:50;box-shadow:4px 0 40px rgba(0,0,0,.12)}
        .main-area{margin-left:220px;flex:1;background:#fafaf8;min-height:100vh;padding-bottom:80px}
        .mobile-nav{display:none}

        /* Responsive */
        @media(max-width:768px){
          .sidebar{display:none}
          .main-area{margin-left:0}
          .mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:50;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-top:0.5px solid #f0f0f0;padding:10px 0;padding-bottom:max(10px,env(safe-area-inset-bottom));justify-content:space-around;align-items:center}
          .mobile-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;color:#aaa;text-decoration:none;padding:0 8px;border:none;background:none;cursor:pointer;font-family:'Inter',sans-serif;flex:1}
          .mobile-nav-item span{font-size:9px;letter-spacing:.1em;color:#aaa}
          .hero-section{height:280px!important}
          .hero-name-txt{font-size:40px!important}
          .content-wrap{padding:0 18px!important}
          .player-wrap{padding:0 18px!important}
          .port-card{flex-direction:column!important;max-width:100%!important}
          .port-card .port-img{width:100%!important;height:180px!important}
          .port-card .port-body{width:100%!important;padding:18px!important}
          .g-grid{grid-template-columns:1fr 1fr 1fr!important}
          .theater-row{max-width:100%!important}
        }
      `}</style>

      {track && <audio ref={audioRef} src={track.src} onEnded={() => setTrackIdx(i => (i+1)%tracks.length)}/>}

      <div className="layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'22px',fontWeight:300,letterSpacing:'.2em',color:'#f0f0ee',padding:'0 28px',marginBottom:'52px'}}>
            Yuria
          </div>
          <nav style={{flex:1,display:'flex',flexDirection:'column',gap:'2px',padding:'0 14px'}}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className="sb-link">
                <div className="sb-bar"/>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d={item.d}/></svg>
                <span>{item.label}</span>
              </Link>
            ))}
            <button onClick={openPw} className="sb-link" style={{background:'transparent'}}>
              <div className="sb-bar"/>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{flexShrink:0}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span>小剧场</span>
            </button>
          </nav>

          {/* 底部设置区 */}
          <div style={{padding:'0 14px',borderTop:'0.5px solid rgba(255,255,255,.08)',paddingTop:'18px',marginTop:'8px'}}>
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="sb-link">
                    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="2" stroke="#888" strokeWidth="1"/>
                      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="#888" strokeWidth="1" strokeLinecap="round"/>
                    </svg>
                    <span style={{fontSize:'12px'}}>管理设置</span>
                  </Link>
                )}
                <button onClick={signOut} className="sb-link" style={{background:'transparent'}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{flexShrink:0}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  <span style={{fontSize:'12px'}}>退出登录</span>
                </button>
              </>
            ) : (
              <button onClick={signInWithGitHub} className="sb-link" style={{background:'transparent'}}>
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="2" stroke="#888" strokeWidth="1"/>
                  <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="#888" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <span style={{fontSize:'12px'}}>设置 / 登录</span>
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main-area">

          {/* HERO */}
          <div className="hero-section" style={{position:'relative',height:'400px',overflow:'hidden'}}>
            {config.cover_url
              ? <img src={config.cover_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} alt="cover"/>
              : <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,#b8c4d0,#90a0b0 45%,#687888)'}}/>
            }
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(250,250,248,0) 0%,rgba(250,250,248,0) 15%,rgba(250,250,248,.08) 38%,rgba(250,250,248,.38) 60%,rgba(250,250,248,.82) 80%,rgba(250,250,248,1) 100%)'}}/>
            <div className="content-wrap" style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 52px 28px',zIndex:2}}>
              <div className="hero-name-txt" style={{fontFamily:'Noto Serif SC,serif',fontSize:'58px',fontWeight:300,letterSpacing:'.16em',color:'#1a1a1a',lineHeight:1}}>Yuria</div>
              <div style={{fontSize:'11px',color:'#999',letterSpacing:'.3em',marginTop:'10px'}}>
                <span className="bdot"/>{config.signature}<span className="bdot bdot2"/>
              </div>
            </div>
          </div>

          {/* MUSIC PLAYER */}
          <div className="player-wrap sr" style={{padding:'0 52px',borderBottom:'0.5px solid #f0f0ee'}} data-d="0">
            <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'16px 0',cursor:'pointer'}} onClick={() => setListOpen(o=>!o)}>
              {/* vinyl */}
              <div className={playing ? 'vinyl-spin' : ''} style={{width:'40px',height:'40px',borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#1a1a1a,#3a3a3a)',position:'relative'}}>
                {track?.cover_url && <img src={track.cover_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover',opacity:.6}} alt=""/>}
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:'33%',height:'33%',borderRadius:'50%',background:'#fafaf8'}}/>
                </div>
              </div>
              {/* info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'#1a1a1a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track?.title ?? '暂无音乐'}</div>
                <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>{track?.artist ?? ''}</div>
              </div>
              {/* waveform */}
              <div style={{display:'flex',alignItems:'flex-end',gap:'3px',height:'20px',flexShrink:0}}>
                {[5,11,7,15,9].map((h,i) => (
                  <div key={i} className={playing?'wv-on':''} style={{width:'2.5px',borderRadius:'2px',background:playing?'#333':'#d0d0d0',height:`${h}px`,transition:'background .2s'}}/>
                ))}
              </div>
              {/* controls */}
              <div style={{display:'flex',alignItems:'center',gap:'7px',flexShrink:0}}>
                <button onClick={e=>{e.stopPropagation();setTrackIdx(i=>(i-1+tracks.length)%tracks.length);setPlaying(false)}}
                  style={{width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #d0d0ce',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'border-color .2s'}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='#888')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#d0d0ce')}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.5 2.5L5.5 6l4 3.5V2.5z" fill="#555"/><rect x="2" y="2.5" width="1.5" height="7" rx=".75" fill="#555"/></svg>
                </button>
                <button onClick={e=>{e.stopPropagation();togglePlay()}}
                  style={{width:'32px',height:'32px',borderRadius:'50%',background:'#1a1a1a',border:'1px solid #1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background .2s'}}
                  onMouseEnter={e=>(e.currentTarget.style.background='#333')} onMouseLeave={e=>(e.currentTarget.style.background='#1a1a1a')}>
                  {playing
                    ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="3" y="2.5" width="2" height="7" rx="1" fill="#fff"/><rect x="7" y="2.5" width="2" height="7" rx="1" fill="#fff"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.5 2.5l6 3.5-6 3.5V2.5z" fill="#fff"/></svg>
                  }
                </button>
                <button onClick={e=>{e.stopPropagation();setTrackIdx(i=>(i+1)%tracks.length);setPlaying(false)}}
                  style={{width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #d0d0ce',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'border-color .2s'}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='#888')} onMouseLeave={e=>(e.currentTarget.style.borderColor='#d0d0ce')}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 2.5L6.5 6l-4 3.5V2.5z" fill="#555"/><rect x="8.5" y="2.5" width="1.5" height="7" rx=".75" fill="#555"/></svg>
                </button>
              </div>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{flexShrink:0,transition:'transform .3s',transform:listOpen?'rotate(180deg)':'none'}}>
                <path d="M2 4.5l4.5 4.5 4.5-4.5" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            {/* track list */}
            <div style={{maxHeight:listOpen?'200px':'0',overflow:'hidden',transition:'max-height .4s cubic-bezier(.22,1,.36,1)'}}>
              {tracks.map((t,i) => (
                <div key={t.id} onClick={()=>{setTrackIdx(i);if(!playing)togglePlay()}}
                  style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 4px',borderTop:'0.5px solid #f0f0ee',cursor:'pointer',borderRadius:'4px',transition:'background .15s'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f5f5f3'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                  <span style={{fontSize:'10px',color:'#ccc',width:'16px',textAlign:'center',flexShrink:0}}>{i+1}</span>
                  <span style={{fontSize:'12px',color:'#777',flex:1}}>{t.title}</span>
                  <span style={{fontSize:'10px',color:'#bbb'}}>{t.artist}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PORTFOLIO */}
          <div className="sr content-wrap" style={{padding:'48px 52px 0'}} data-d="60">
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'28px'}}>
              <span style={{fontSize:'10px',letterSpacing:'.3em',color:'#aaa'}}>PORTFOLIO</span>
              <Link href="/portfolio" style={{fontSize:'11px',color:'#aaa',display:'flex',alignItems:'center',gap:'3px',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#1a1a1a'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#aaa'}>
                全部 <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </Link>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              {[
                {rev:false,bg:'linear-gradient(160deg,#8a9aaa,#5a6a7a)',tag:'PHOTOGRAPHY · 2025',name:'秋日系列',excerpt:'光影交错的午后，城市在镜头里变得温柔而遥远…'},
                {rev:true, bg:'linear-gradient(160deg,#9898aa,#686878)',tag:'ILLUSTRATION · 2025',name:'城市素描',excerpt:'用线条描绘城市的轮廓，每一笔都是对空间的感知…'},
              ].map((item,i) => (
                <div key={i} className="sr port-card hover-lift" data-d={`${80+i*60}`}
                  style={{display:'flex',flexDirection:'row',borderRadius:'14px',overflow:'hidden',cursor:'pointer'}}>
                  <div className="port-img" style={{order:item.rev?2:1,width:'52%',flexShrink:0,background:item.bg,minHeight:'200px'}}/>
                  <div className="port-body" style={{order:item.rev?1:2,flex:1,background:'#f5f5f2',padding:'32px 36px',display:'flex',flexDirection:'column',justifyContent:'center',gap:'10px'}}>
                    <div style={{fontSize:'9px',letterSpacing:'.22em',color:'#bbb'}}>{item.tag}</div>
                    <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'20px',fontWeight:300,letterSpacing:'.08em',color:'#1a1a1a'}}>{item.name}</div>
                    <div style={{fontSize:'12px',color:'#999',lineHeight:1.9}}>{item.excerpt}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GALLERY */}
          <div className="sr content-wrap" style={{padding:'48px 52px 0'}} data-d="100">
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'28px'}}>
              <span style={{fontSize:'10px',letterSpacing:'.3em',color:'#aaa'}}>GALLERY</span>
              <Link href="/gallery" style={{fontSize:'11px',color:'#aaa',display:'flex',alignItems:'center',gap:'3px',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#1a1a1a'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#aaa'}>
                全部 <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </Link>
            </div>
            <div className="g-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'20px'}}>
              {[
                {label:'黄昏之光',count:'12 张',bg:'linear-gradient(150deg,#aab0ba,#7a8090)'},
                {label:'森林系列',count:'8 张', bg:'linear-gradient(150deg,#bcb8c8,#8a8898)'},
                {label:'城市迷雾',count:'16 张',bg:'linear-gradient(150deg,#b4bcb8,#848c88)'},
                {label:'黑白系列',count:'9 张', bg:'linear-gradient(150deg,#484848,#1a1a1a)'},
                {label:'春日记录',count:'14 张',bg:'linear-gradient(150deg,#c8d0b8,#909878)'},
                {label:'蓝调时刻',count:'7 张', bg:'linear-gradient(150deg,#a8b8d0,#6878a0)'},
              ].map((item,i) => (
                <Link key={i} href="/gallery" className="sr hover-lift" data-d={`${110+i*30}`}
                  style={{cursor:'pointer',textDecoration:'none',display:'block'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-3px)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform='none'}>
                  <div style={{position:'relative',height:'140px',margin:'4px'}}>
                    {[{rot:'-3.2deg',op:.45,top:0},{rot:'1.5deg',op:.7,top:9},{rot:'0deg',op:1,top:18}].map((l,j) => (
                      <div key={j} style={{position:'absolute',left:'4%',width:'92%',top:`${l.top}px`,transform:`rotate(${l.rot})`,zIndex:j+1,borderRadius:'9px',overflow:'hidden',border:'2px solid #fff',boxShadow:`0 ${2+j*2}px ${8+j*5}px rgba(0,0,0,${.06+j*.015})`}}>
                        <div style={{height:'90px',background:item.bg,opacity:l.op}}/>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:'12px',color:'#777',padding:'7px 2px 0'}}>{item.label}</div>
                  <div style={{fontSize:'10px',color:'#bbb',marginTop:'2px'}}>{item.count}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 小剧场 */}
          <div className="sr content-wrap" style={{padding:'48px 52px 64px'}} data-d="140">
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'28px'}}>
              <span style={{fontSize:'10px',letterSpacing:'.3em',color:'#aaa'}}>小剧场</span>
            </div>
            <button onClick={openPw} className="theater-row hover-lift"
              style={{width:'100%',display:'flex',alignItems:'center',gap:'18px',padding:'22px 26px',borderRadius:'16px',background:'rgba(26,26,26,.04)',border:'0.5px solid rgba(0,0,0,.07)',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'background .2s'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(26,26,26,.08)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='rgba(26,26,26,.04)'}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'rgba(26,26,26,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <div style={{flex:1,textAlign:'left'}}>
                <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'15px',fontWeight:300,letterSpacing:'.1em',color:'#1a1a1a'}}>小剧场</div>
                <div style={{fontSize:'11px',color:'#aaa',marginTop:'4px'}}>私密空间 · 输入密码访问</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>

        </main>
      </div>

      {/* ── MOBILE NAV ── */}
      <nav className="mobile-nav">
        {[
          {href:'/',label:'主页',d:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z'},
          {href:'/portfolio',label:'作品集',d:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'},
          {href:'/gallery',label:'图集',d:'M4 16l4-8 4 8M2 12h12M16 6h.01M16 10a4 4 0 110-8 4 4 0 010 8z'},
        ].map(item => (
          <Link key={item.href} href={item.href} className="mobile-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={item.d}/></svg>
            <span>{item.label}</span>
          </Link>
        ))}
        <button onClick={openPw} className="mobile-nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span>小剧场</span>
        </button>
        {/* 手机端设置按钮 */}
        {user ? (
          isAdmin
            ? <Link href="/admin" className="mobile-nav-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.4" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                <span>设置</span>
              </Link>
            : <button onClick={signOut} className="mobile-nav-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.4" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                <span>退出</span>
              </button>
        ) : (
          <button onClick={signInWithGitHub} className="mobile-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.4" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <span>设置</span>
          </button>
        )}
      </nav>

      {/* ── PASSWORD MODAL ── */}
      {pwOpen && (
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(18,18,18,.52)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)'}} onClick={closePw}>
          <div className="pw-fadein" style={{background:'rgba(252,252,250,.97)',borderRadius:'22px',padding:'44px 40px',width:'310px',textAlign:'center',boxShadow:'0 32px 80px rgba(0,0,0,.18)'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'16px',fontWeight:300,letterSpacing:'.15em',marginBottom:'4px'}}>小剧场</div>
            <div style={{fontSize:'11px',color:'#aaa',letterSpacing:'.1em',marginBottom:'30px'}}>私密空间 · 请输入密码</div>
            <div style={{display:'flex',justifyContent:'center',gap:'10px',marginBottom:'20px'}}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{width:'9px',height:'9px',borderRadius:'50%',border:'0.5px solid',transition:'all .2s',background:pw.length>i?'#1a1a1a':'transparent',borderColor:pw.length>i?'#1a1a1a':'#ddd'}}/>
              ))}
            </div>
            {pwErr && <p style={{fontSize:'11px',color:'#c0392b',marginBottom:'10px'}}>{pwErr}</p>}
            <input ref={inputRef} type="password" value={pw}
              onChange={e=>{setPw(e.target.value);setPwErr('')}}
              onKeyDown={e=>e.key==='Enter'&&checkPw()}
              style={{width:'100%',border:'0.5px solid #e0e0e0',borderRadius:'12px',padding:'12px',textAlign:'center',letterSpacing:'.2em',fontSize:'14px',marginBottom:'16px',background:'transparent',color:'#1a1a1a',outline:'none',fontFamily:'Inter,sans-serif'}}
              placeholder=""
            />
            <button onClick={checkPw} disabled={checking}
              style={{width:'100%',background:'#1a1a1a',color:'#fff',border:'none',borderRadius:'12px',padding:'12px',fontSize:'12px',letterSpacing:'.18em',cursor:'pointer',marginBottom:'12px',fontFamily:'Inter,sans-serif',opacity:checking?.7:1,transition:'opacity .2s'}}>
              {checking ? '验证中…' : '进 入'}
            </button>
            <button onClick={closePw} style={{fontSize:'11px',color:'#bbb',cursor:'pointer',background:'none',border:'none',fontFamily:'Inter,sans-serif'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#666'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#bbb'}>
              取消
            </button>
          </div>
        </div>
      )}
    </>
  )
}
