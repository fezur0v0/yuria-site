'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type ImageItem = { url: string; caption?: string }

type Character = {
  id: string
  name: string
  avatar: string | null
}

type Record = {
  id: string
  title: string
  extra_tag: string | null
  content: string | null
  images: ImageItem[] | null
  character_id: string | null
  characters: Character | null
  created_at: string
}

const PAGE_SIZE = 9

// 极简 markdown 转纯文本预览（去掉 ** 和 > 符号，只做列表页摘要用）
function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\n+/g, ' ')
}

export default function Records() {
  const router = useRouter()
  const [records, setRecords] = useState<Record[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeChar, setActiveChar] = useState<string | null>(null)
  const [charsExpanded, setCharsExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('notes_auth') !== 'true') {
      router.replace('/notes'); return
    }
    fetchCharacters()
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('notes_auth') !== 'true') return
    fetchRecords()
  }, [page, search, activeChar])

  async function fetchCharacters() {
    const { data } = await supabase.from('characters').select('*').order('created_at', { ascending: true })
    setCharacters(data || [])
  }

  async function fetchRecords() {
    setLoading(true)
    let query = supabase
      .from('theater_records')
      .select('*, characters(id,name,avatar)', { count: 'exact' })

    if (search) {
      query = query.or(`title.ilike.%${search}%,extra_tag.ilike.%${search}%,content.ilike.%${search}%`)
    }
    if (activeChar) {
      query = query.eq('character_id', activeChar)
    }

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    setRecords((data as any) || [])
    setTotal(count || 0)
    setLoading(false)
  }

  function selectChar(id: string | null) {
    setActiveChar(id)
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const CharFilter = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      <button onClick={() => selectChar(null)}
        style={{
          padding: '6px 14px', borderRadius: '20px', fontSize: '12px', border: '1px solid',
          cursor: 'pointer', background: activeChar === null ? '#1a1a1a' : '#f5f5f3',
          color: activeChar === null ? '#fff' : '#666',
          borderColor: activeChar === null ? '#1a1a1a' : '#ebebeb',
        }}>全部</button>
      {(charsExpanded ? characters : characters.slice(0, 5)).map(c => (
        <button key={c.id} onClick={() => selectChar(c.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px 5px 5px',
            borderRadius: '20px', fontSize: '12px', border: '1px solid', cursor: 'pointer',
            background: activeChar === c.id ? '#1a1a1a' : '#f5f5f3',
            color: activeChar === c.id ? '#fff' : '#666',
            borderColor: activeChar === c.id ? '#1a1a1a' : '#ebebeb',
          }}>
          {c.avatar
            ? <img src={c.avatar} alt={c.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e8e8e6' }} />}
          {c.name}
        </button>
      ))}
      {characters.length > 5 && (
        <button onClick={() => setCharsExpanded(v => !v)}
          style={{ fontSize: '11px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>
          {charsExpanded ? '收起 ↑' : `更多 (${characters.length}) ↓`}
        </button>
      )}
    </div>
  )

  function ThumbGrid({ images, recordId }: { images: ImageItem[]; recordId: string }) {
    if (!images || images.length === 0) return null
    const shown = images.slice(0, 3)
    const remaining = images.length - 3
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px', marginTop: '12px' }}>
        {shown.map((img, i) => {
          const isLast = i === 2 && remaining > 0
          return (
            <div key={i} onClick={e => { e.stopPropagation(); router.push(`/notes/records/${recordId}`) }}
              style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: '#f0f0ee' }}>
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {isLast && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 500,
                }}>+{remaining}</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafaf8', fontFamily: 'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .card-item { transition: box-shadow 0.2s; }
        .card-item:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important; }
        .sb-link { display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;cursor:pointer;color:#888;font-size:13px;text-decoration:none;transition:all 0.2s;background:transparent;border:none;width:100%;font-family:Inter,sans-serif; }
        .sb-link:hover,.sb-link.active { color:#1a1a1a;background:#f0f0ee; }
        .sb-link.active { font-weight:500; }
        .sidebar-desktop { width: 260px !important; }
        @media(max-width:768px){
          .sidebar-desktop{display:none!important}
          .mobile-nav{display:flex!important}
          .main-content{margin-left:0!important;padding:16px!important;padding-bottom:80px!important}
          .cards-grid{grid-template-columns:1fr!important}
          .top-bar{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
        }
        @media(min-width:769px){
          .mobile-nav{display:none!important}
          .filter-float{display:none!important}
        }
      `}</style>

      <aside className="sidebar-desktop" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px', background: '#fff', borderRight: '1px solid #f0f0ee', display: 'flex', flexDirection: 'column', padding: '32px 0', zIndex: 40 }}>
        <div style={{ padding: '0 24px 28px', fontFamily: 'Noto Serif SC,serif', fontSize: '20px', fontWeight: 300, letterSpacing: '0.2em', color: '#1a1a1a' }}>Yuria</div>
        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button className="sb-link" onClick={() => router.push('/notes/library')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            词库
          </button>
          <button className="sb-link active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            记录
          </button>
        </nav>
        <div style={{ padding: '28px 20px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ color: '#aaa', fontSize: '11px', letterSpacing: '0.2em', marginBottom: '16px' }}>人物筛选</div>
          <CharFilter />
        </div>
      </aside>

      <div className="main-content" style={{ marginLeft: '260px', flex: 1, padding: '32px 40px', paddingBottom: '60px' }}>
        <div className="top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Noto Serif SC,serif', fontSize: '24px', fontWeight: 300, letterSpacing: '0.1em', color: '#1a1a1a', margin: 0 }}>记录</h1>
          <button onClick={() => router.push('/notes/records/new')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            新增记录
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="搜索角色名、番外标签、标题..."
            style={{ width: '100%', padding: '11px 14px 11px 40px', border: '1px solid #ebebeb', borderRadius: '12px', fontSize: '13px', color: '#333', background: '#fff', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#1a1a1a'}
            onBlur={e => e.target.style.borderColor = '#ebebeb'} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>加载中...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>暂无记录</div>
        ) : (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {records.map(r => (
              <div key={r.id} className="card-item" onClick={() => router.push(`/notes/records/${r.id}`)}
                style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0ee', padding: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  {r.characters?.avatar
                    ? <img src={r.characters.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e8e8e6' }} />}
                  <span style={{ fontSize: '13px', color: '#666' }}>{r.characters?.name || '未命名'}</span>
                  <span style={{ marginLeft: 'auto', color: '#ccc' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                  </span>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', marginBottom: '4px' }}>{r.title}</div>
                {r.extra_tag && <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>{r.extra_tag}</div>}
                {r.content && (
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.7, overflow: 'hidden', maxHeight: '48px', maskImage: 'linear-gradient(to bottom,black 50%,transparent)', WebkitMaskImage: 'linear-gradient(to bottom,black 50%,transparent)' }}>
                    {stripMarkdown(r.content)}
                  </div>
                )}

                <ThumbGrid images={r.images || []} recordId={r.id} />

                <div style={{ fontSize: '11px', color: '#bbb', marginTop: '12px' }}>{new Date(r.created_at).toLocaleDateString('zh-CN')}</div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '32px', flexWrap: 'wrap' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #ebebeb', background: '#fff', color: page === 1 ? '#ccc' : '#333', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← 上一页</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return <button key={p} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid', borderColor: p === page ? '#1a1a1a' : '#ebebeb', background: p === page ? '#1a1a1a' : '#fff', color: p === page ? '#fff' : '#333', cursor: 'pointer', fontSize: '13px' }}>{p}</button>
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #ebebeb', background: '#fff', color: page === totalPages ? '#ccc' : '#333', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>下一页 →</button>
          </div>
        )}
      </div>

      <nav className="mobile-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '0.5px solid #ebebeb', padding: '10px 0', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', justifyContent: 'space-around', zIndex: 50 }}>
        {[{ label: '词库', path: '/notes/library', active: false }, { label: '记录', path: '/notes/records', active: true }].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', flex: 1, color: item.active ? '#1a1a1a' : '#bbb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              {item.label === '词库' ? <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></> : <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></>}
            </svg>
            <span style={{ fontSize: '9px', letterSpacing: '0.1em' }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="filter-float" onClick={() => setFilterOpen(v => !v)}
        style={{ position: 'fixed', bottom: '80px', left: '16px', width: '44px', height: '44px', borderRadius: '50%', background: activeChar ? '#1a1a1a' : '#fff', border: '1px solid #e8e8e6', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 40, color: activeChar ? '#fff' : '#666' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
      </button>

      {filterOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setFilterOpen(false)}>
          <div style={{ position: 'absolute', bottom: '80px', left: '16px', background: '#fff', borderRadius: '16px', padding: '20px', width: 'min(280px,calc(100vw - 32px))', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <CharFilter />
          </div>
        </div>
      )}
    </div>
  )
}
