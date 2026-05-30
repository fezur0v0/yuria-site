看到了，有两个问题要解决：

**问题1：** `Multiple GoTrueClient instances` — 说明 `createClient()` 被调用了多次，需要改成单例模式。

**问题2：** 首页还在用旧的硬编码数据没有完全替换掉。

直接给你完整的首页代码，把 `app/page.tsx` 整个替换掉：

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

let supabaseInstance: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseInstance) supabaseInstance = createClient()
  return supabaseInstance
}

const ADMIN_EMAIL = 'fezur0v0@gmail.com'

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [config, setConfig] = useState({ cover_url: '', signature: '我的小小世界' })
  const [tracks, setTracks] = useState<any[]>([])
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [portfolioItems, setPortfolioItems] = useState<any[]>([])
  const [galleryItems, setGalleryItems] = useState<any[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  // scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.sr')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const d = Number((e.target as HTMLElement).dataset.d ?? 0)
            setTimeout(() => e.target.classList.add('on'), d)
          }
        })
      },
      { threshold: 0.08 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // auth + data
  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setIsAdmin(u?.email === ADMIN_EMAIL)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      setIsAdmin(u?.email === ADMIN_EMAIL)
    })
    fetchConfig()
    fetchTracks()
    fetchPortfolio()
    fetchGallery()
    return () => listener.subscription.unsubscribe()
  }, [])

  // 切歌时自动播放
  useEffect(() => {
    if (!audioRef.current) return
    const track = tracks[trackIdx]
    if (!track) return
    audioRef.current.src = track.src
    audioRef.current.load()
    if (playing) {
      audioRef.current.play().catch(() => setPlaying(false))
    }
  }, [trackIdx, tracks, playing])

  async function fetchConfig() {
    const supabase = getSupabase()
    const { data } = await supabase.from('site_config').select('*')
    if (data) {
      const map: any = {}
      data.forEach((r: any) => { map[r.key] = r.value })
      setConfig({ cover_url: map.cover_url ?? '', signature: map.signature ?? '我的小小世界' })
    }
  }

  async function fetchTracks() {
    const supabase = getSupabase()
    const { data } = await supabase.from('music_tracks').select('*').order('sort_order')
    setTracks(data || [])
  }

  async function fetchPortfolio() {
    const supabase = getSupabase()
    const { data } = await supabase.from('homepage_portfolio')
      .select('*').eq('is_visible', true).order('sort_order')
    setPortfolioItems(data || [])
  }

  async function fetchGallery() {
    const supabase = getSupabase()
    const { data } = await supabase.from('homepage_gallery')
      .select('*').eq('is_visible', true).order('sort_order')
    setGalleryItems(data || [])
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
        .sb-link{position:relative;display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:9px;cursor:pointer;color:#585858;font-size:13px;letter-spacing:.08em;transition:color .2s,background .2s;text-decoration:none;border:none;font-family:'Inter',sans-serif;text-align:left;width:100%;background:transparent;}
        .sb-link:hover{color:#e8e8e6;background:rgba(255,255,255,.08)}
        .sb-bar{position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:14px;background:#b0b0b0;border-radius:2px;opacity:0;transition:opacity .2s;}
        .sb-link:hover .sb-bar{opacity:1}
        .layout{display:flex;min-height:100vh}
        .sidebar{position:fixed;left:0;top:0;bottom:0;width:260px;background:rgba(18,18,18,.9);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);display:flex;flex-direction:column;padding:52px 0 36px;z-index:50;box-shadow:4px 0 48px rgba(0,0,0,.14);}
        .main-area{margin-left:260px;flex:1;background:#fafaf8;min-height:100vh;padding-bottom:80px}
        .mobile-nav{display:none}
        .section-header{display:flex;align-items:baseline;justify-content:space-between;margin-top:20px;margin-bottom:28px;padding-bottom:4px;border-bottom:1px solid #e8e8e6;}
        .section-label{font-size:13px;letter-spacing:0.3em;color:#aaa;font-weight:400;}
        .section-more{font-size:12px;color:#aaa;display:flex;align-items:center;gap:5px;text-decoration:none;transition:color 0.2s;}
        .section-more:hover{color:#1a1a1a;}
        .g-card{cursor:pointer;text-decoration:none;display:block;transition:transform 0.3s;text-align:center;}
        .g-card:hover{transform:translateY(-3px);}
        .gallery-title{font-size:14px;color:#666;padding:16px 2px 6px;letter-spacing:0.04em;font-weight:400;text-align:center;}
        @media(max-width:768px){
          .sidebar{display:none}
          .main-area{margin-left:0;padding-bottom:110px!important;}
          .mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:50;background:rgba(255,255,255,.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:0.5px solid #ebebeb;padding:10px 4px;padding-bottom:max(10px,env(safe-area-inset-bottom));justify-content:space-around;align-items:center;}
          .mobile-nav-item{position:relative;z-index:10000;display:flex;flex-direction:column;align-items:center;gap:4px;color:#bbb;text-decoration:none;padding:0 4px;border:none;background:none;cursor:pointer;font-family:'Inter',sans-serif;flex:1;pointer-events:auto;}
          .mobile-nav-item span{font-size:9px;letter-spacing:.1em;color:#bbb}
          .hero-section{height:260px!important}
          .hero-name-txt{font-size:38px!important}
          .content-wrap{padding:0 20px!important}
          .player-wrap{padding:0 20px!important}
          .port-list{gap:42px!important;}
          .port-item{flex-direction:column!important;align-items:flex-start!important;}
          .port-text-wrap{padding:0!important;width:100%;}
          .port-tag-row{order:1;padding:0;width:100%;text-align:left;}
          .port-name-row{order:2;padding:0;width:100%;text-align:left;}
          .port-excerpt-row{order:3;display:block!important;padding:0;width:100%;text-align:left;}
          .port-img-wrap{order:4!important;width:100%!important;max-width:none!important;margin-top:14px;aspect-ratio:16/9!important;}
          .port-img-inner{border-radius:14px!important;width:100%;height:100%;}
          .g-grid{grid-template-columns:1fr 1fr!important;gap:16px!important}
          .theater-btn{max-width:100%!important}
          .section-label{font-size:11px}
          .section-more{font-size:10px}
        }
      `}</style>

      {track && <audio ref={audioRef} onEnded={() => setTrackIdx((i) => (i + 1) % tracks.length)} />}

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'24px',fontWeight:300,letterSpacing:'.22em',color:'#f0f0ee',padding:'0 32px',marginBottom:'56px'}}>
            Yuria
          </div>
          <nav style={{flex:1,display:'flex',flexDirection:'column',gap:'3px',padding:'0 16px'}}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="sb-link">
                <div className="sb-bar" />
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <path d={item.d} />
                </svg>
                <span>{item.label}</span>
              </Link>
            ))}
            <Link href="/notes" className="sb-link">
              <div className="sb-bar" />
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{flexShrink:0}}>
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>小剧场</span>
            </Link>
          </nav>
          <div style={{padding:'0 16px',borderTop:'0.5px solid rgba(255,255,255,.09)',paddingTop:'20px',marginTop:'8px'}}>
            <Link href="/admin" className="sb-link">
              <div className="sb-bar" />
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <span style={{fontSize:'12px'}}>管理设置</span>
            </Link>
          </div>
        </aside>

        {/* MAIN */}
        <main className="main-area">
          {/* HERO */}
          <div className="hero-section" style={{position:'relative',height:'420px',overflow:'hidden'}}>
            {config.cover_url
              ? <img src={config.cover_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} alt="cover" />
              : <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,#b8c4d0,#90a0b0 45%,#687888)'}} />
            }
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(250,250,248,0) 0%,rgba(250,250,248,0) 15%,rgba(250,250,248,.08) 38%,rgba(250,250,248,.38) 60%,rgba(250,250,248,.82) 80%,rgba(250,250,248,1) 100%)'}} />
            <div className="content-wrap" style={{position:'absolute',bottom:0,left:0,right:0,padding:'0 56px 30px',zIndex:2}}>
              <div className="hero-name-txt" style={{fontFamily:'Noto Serif SC,serif',fontSize:'60px',fontWeight:300,letterSpacing:'.16em',color:'#1a1a1a',lineHeight:1}}>
                Yuria
              </div>
              <div style={{fontSize:'11px',color:'#999',letterSpacing:'.3em',marginTop:'10px'}}>
                <span className="bdot" />{config.signature}<span className="bdot bdot2" />
              </div>
            </div>
          </div>

          {/* MUSIC PLAYER */}
          <div className="player-wrap sr" style={{padding:'0 56px',borderBottom:'0.5px solid #efefed'}} data-d="0">
            <div style={{display:'flex',alignItems:'center',gap:'16px',padding:'18px 0',cursor:'pointer'}} onClick={() => setListOpen(o => !o)}>
              <div className={playing ? 'vinyl-spin' : ''} style={{width:'42px',height:'42px',borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#1a1a1a 0%,#3a3a3a 50%,#1a1a1a 100%)',position:'relative',boxShadow:'0 2px 10px rgba(0,0,0,.25)'}}>
                {track?.cover_url && <img src={track.cover_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover',opacity:0.7}} alt="" />}
                <div style={{position:'absolute',inset:'28%',borderRadius:'50%',border:'0.5px solid rgba(255,255,255,.18)'}} />
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'#1a1a1a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{track?.title ?? '暂无音乐'}</div>
                <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>{track?.artist ?? ''}</div>
              </div>
              <div style={{display:'flex',alignItems:'flex-end',gap:'3px',height:'22px',flexShrink:0}}>
                {[5,11,7,15,9].map((h,i) => (
                  <div key={i} className={playing ? 'wv-on' : ''} style={{width:'2.5px',borderRadius:'2px',background:playing?'#333':'#d0d0d0',height:`${h}px`,transition:'background .2s'}} />
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                {[
                  { onClick: (e: any) => { e.stopPropagation(); setTrackIdx(i => (i-1+tracks.length)%tracks.length); setPlaying(true) }, path: <><path d="M9.5 2.5L5.5 6l4 3.5V2.5z" fill="#555"/><rect x="2" y="2.5" width="1.5" height="7" rx=".75" fill="#555"/></> },
                  { onClick: (e: any) => { e.stopPropagation(); togglePlay() }, path: playing ? <><rect x="3" y="2.5" width="2" height="7" rx="1" fill="#fff"/><rect x="7" y="2.5" width="2" height="7" rx="1" fill="#fff"/></> : <path d="M3.5 2.5l6 3.5-6 3.5V2.5z" fill="#fff"/>, dark: true },
                  { onClick: (e: any) => { e.stopPropagation(); setTrackIdx(i => (i+1)%tracks.length); setPlaying(true) }, path: <><path d="M2.5 2.5L6.5 6l-4 3.5V2.5z" fill="#555"/><rect x="8.5" y="2.5" width="1.5" height="7" rx=".75" fill="#555"/></> },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.onClick}
                    style={{width:'33px',height:'33px',borderRadius:'50%',background:btn.dark?'#1a1a1a':'#fff',border:`1px solid ${btn.dark?'#1a1a1a':'#d8d8d8'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background .2s,border-color .2s'}}
                    onMouseEnter={e => { e.currentTarget.style.background = btn.dark ? '#383838' : '#f5f5f3'; if(!btn.dark) e.currentTarget.style.borderColor='#888' }}
                    onMouseLeave={e => { e.currentTarget.style.background = btn.dark ? '#1a1a1a' : '#fff'; if(!btn.dark) e.currentTarget.style.borderColor='#d8d8d8' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">{btn.path}</svg>
                  </button>
                ))}
              </div>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{flexShrink:0,transition:'transform .3s',transform:listOpen?'rotate(180deg)':'none'}}>
                <path d="M2 4.5l4.5 4.5 4.5-4.5" stroke="#c0c0c0" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{maxHeight:listOpen?'220px':'0',overflow:'hidden',transition:'max-height .4s cubic-bezier(.22,1,.36,1)'}}>
              {tracks.map((t, i) => (
                <div key={t.id} onClick={() => { setTrackIdx(i); if(!playing) setPlaying(true) }}
                  style={{display:'flex',alignItems:'center',gap:'14px',padding:'11px 4px',borderTop:'0.5px solid #f2f2f0',cursor:'pointer',borderRadius:'6px',transition:'background .15s'}}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#f5f5f3'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                  <span style={{fontSize:'10px',color:'#ccc',width:'18px',textAlign:'center',flexShrink:0}}>{i+1}</span>
                  <span style={{fontSize:'13px',color:'#666',flex:1}}>{t.title}</span>
                  <span style={{fontSize:'11px',color:'#bbb'}}>{t.artist}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PORTFOLIO */}
          <div className="sr content-wrap" style={{padding:'52px 56px 0'}} data-d="60">
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginTop:'18px',marginBottom:'42px'}}>
              <span style={{fontSize:'13px',letterSpacing:'.32em',color:'#aaa'}}>PORTFOLIO</span>
              <Link href="/portfolio" style={{fontSize:'13px',color:'#aaa',display:'flex',alignItems:'center',gap:'4px',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#1a1a1a'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#aaa'}>
                全部 <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </Link>
            </div>
            <div className="port-list" style={{display:'flex',flexDirection:'column',gap:'48px'}}>
              {portfolioItems.length === 0 && (
                <p style={{color:'#ccc',fontSize:'13px',textAlign:'center',padding:'32px 0'}}>暂无作品，请在管理面板中添加</p>
              )}
              {portfolioItems.map((item, i) => (
                <div key={item.id} className="sr port-item" data-d={`${80+i*60}`}
                  style={{display:'flex',flexDirection:'row',gap:'0',alignItems:'stretch',cursor:'pointer'}}>
                  <div className="port-img-wrap"
                    style={{order:i%2===1?2:1,width:'46%',maxWidth:'520px',flexShrink:0,borderRadius:'16px',overflow:'hidden',aspectRatio:'16/9',background:'linear-gradient(160deg,#8a9aaa,#5a6a7a)',transition:'transform .35s,box-shadow .35s'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-3px)';(e.currentTarget as HTMLElement).style.boxShadow='0 16px 48px rgba(0,0,0,.1)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='none';(e.currentTarget as HTMLElement).style.boxShadow='none'}}>
                    {item.cover_url
                      ? <img src={item.cover_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={item.title} />
                      : <div className="port-img-inner" style={{width:'100%',height:'100%',background:'linear-gradient(160deg,#8a9aaa,#5a6a7a)'}} />
                    }
                  </div>
                  <div className="port-text-wrap"
                    style={{order:i%2===1?1:2,flex:1,padding:i%2===1?'8px 28px 8px 0':'8px 0 8px 28px',display:'flex',flexDirection:'column',justifyContent:'center',gap:'12px'}}>
                    <div className="port-tag-row" style={{fontSize:'13px',letterSpacing:'.22em',color:'#bbb'}}>
                      {item.category}{item.year ? ` · ${item.year}` : ''}
                    </div>
                    <div className="port-name-row" style={{fontFamily:'Noto Serif SC,serif',fontSize:'24px',fontWeight:300,letterSpacing:'.08em',color:'#1a1a1a',lineHeight:1.3}}>
                      {item.title}
                    </div>
                    <div className="port-excerpt-row" style={{fontSize:'13px',color:'#999',lineHeight:1.9}}>
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GALLERY */}
          <div className="sr content-wrap" style={{padding:'52px 56px 0'}} data-d="100">
            <div className="section-header">
              <span className="section-label">GALLERY</span>
              <Link href="/gallery" className="section-more">
                全部 <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </Link>
            </div>
            <div className="g-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'24px'}}>
              {galleryItems.length === 0 && (
                <p style={{color:'#ccc',fontSize:'13px',gridColumn:'1/-1',textAlign:'center',padding:'32px 0'}}>暂无图集，请在管理面板中添加</p>
              )}
              {galleryItems.map((item, i) => (
                <Link key={item.id} href="/gallery" className="sr g-card" data-d={`${110+i*28}`}
                  onMouseEnter={e=>((e.currentTarget as HTMLElement).style.transform='translateY(-3px)')}
                  onMouseLeave={e=>((e.currentTarget as HTMLElement).style.transform='none')}>
                  <div style={{position:'relative',paddingBottom:'66.67%',margin:'4px'}}>
                    {[
                      {rot:'-3.2deg',op:0.42,top:'0%'},
                      {rot:'1.5deg',op:0.68,top:'6%'},
                      {rot:'0deg',op:1,top:'12%'},
                    ].map((l, j) => (
                      <div key={j} style={{position:'absolute',left:'4%',width:'92%',top:l.top,transform:`rotate(${l.rot})`,zIndex:j+1,borderRadius:'10px',overflow:'hidden',border:'2px solid #fff',boxShadow:`0 ${2+j*3}px ${10+j*6}px rgba(0,0,0,${0.06+j*0.02})`,aspectRatio:'3/2'}}>
                        {item.cover_url && j === 2
                          ? <img src={item.cover_url} style={{width:'100%',height:'100%',objectFit:'cover',opacity:l.op}} alt={item.title} />
                          : <div style={{width:'100%',paddingBottom:'66.67%',background:'linear-gradient(150deg,#aab0ba,#7a8090)',opacity:l.op}} />
                        }
                      </div>
                    ))}
                  </div>
                  <div className="gallery-title">{item.title}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 小剧场 */}
          <div className="sr content-wrap" style={{padding:'52px 56px 72px'}} data-d="140">
            <div className="section-header">
              <span className="section-label">小剧场</span>
            </div>
            <Link href="/notes" className="theater-btn"
              style={{width:'100%',display:'flex',alignItems:'center',gap:'20px',padding:'24px 28px',borderRadius:'18px',background:'rgba(26,26,26,.04)',border:'0.5px solid rgba(0,0,0,.07)',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'background .2s,box-shadow .2s',textDecoration:'none',color:'inherit'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(26,26,26,.08)';(e.currentTarget as HTMLElement).style.boxShadow='0 8px 32px rgba(0,0,0,.06)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(26,26,26,.04)';(e.currentTarget as HTMLElement).style.boxShadow='none'}}>
              <div style={{width:'46px',height:'46px',borderRadius:'50%',background:'rgba(26,26,26,.07)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div style={{flex:1,textAlign:'left'}}>
                <div style={{fontFamily:'Noto Serif SC,serif',fontSize:'16px',fontWeight:300,letterSpacing:'.1em',color:'#1a1a1a'}}>小剧场</div>
                <div style={{fontSize:'12px',color:'#aaa',marginTop:'5px'}}>私密空间 · 点击进入</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </Link>
          </div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <nav className="mobile-nav">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="mobile-nav-item">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.d} />
            </svg>
            <span>{item.label}</span>
          </Link>
        ))}
        <Link href="/notes" className="mobile-nav-item">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.4" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span>小剧场</span>
        </Link>
        {isAdmin && (
          <Link href="/admin" className="mobile-nav-item">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.4" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            <span>管理设置</span>
          </Link>
        )}
      </nav>
    </>
  )
}
```

把这个完整替换 `app/page.tsx`，push 之后首页就会读取 Supabase 里的数据了～
