'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import TableBuilderModal from '@/components/TableBuilderModal'

const supabase = createClient()

type ImageItem = { url: string; caption?: string }
type DraftImage = ImageItem & { uploading?: boolean }

type Character = {
  id: string
  name: string
  avatar: string | null
}

type RecordRow = {
  id: string
  title: string
  extra_tag: string | null
  content: string | null
  images: ImageItem[] | null
  character_id: string | null
  characters: Character | null
  created_at: string
}

type CardOption = { id: string; title: string }

const PAGE_SIZE = 9

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\n+/g, ' ')
}

export default function Records() {
  const router = useRouter()
  const [records, setRecords] = useState<RecordRow[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeChar, setActiveChar] = useState<string | null>(null)
  const [charsExpanded, setCharsExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)

  // 新增记录弹窗
  const [showAdd, setShowAdd] = useState(false)
  const [cardOptions, setCardOptions] = useState<CardOption[]>([])
  const [saving, setSaving] = useState(false)
  const [newRecord, setNewRecord] = useState({
    character_id: '',
    card_id: '',
    title: '',
    extra_tag: '',
    content: '',
  })
  const [draftImages, setDraftImages] = useState<DraftImage[]>([])
  const contentRef = useRef<HTMLTextAreaElement>(null)

  // 角色下拉
  const [charDropdownOpen, setCharDropdownOpen] = useState(false)
  const [showNewCharForm, setShowNewCharForm] = useState(false)
  const [newCharName, setNewCharName] = useState('')
  const [newCharAvatar, setNewCharAvatar] = useState('')
  const [newCharUploading, setNewCharUploading] = useState(false)
  const [savingNewChar, setSavingNewChar] = useState(false)

  // 词库下拉
  const [cardDropdownOpen, setCardDropdownOpen] = useState(false)
  const [cardSearch, setCardSearch] = useState('')

  // 表格构建器
  const [showTableBuilder, setShowTableBuilder] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('notes_auth') !== 'true') {
      router.replace('/notes'); return
    }
    fetchCharacters()
    fetchCardOptions()
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('notes_auth') !== 'true') return
    fetchRecords()
  }, [page, search, activeChar])

  async function fetchCharacters() {
    const { data } = await supabase.from('characters').select('*').order('created_at', { ascending: true })
    setCharacters(data || [])
  }

  async function fetchCardOptions() {
    const { data } = await supabase.from('theater_cards').select('id,title').order('created_at', { ascending: false })
    setCardOptions(data || [])
  }

  async function fetchRecords() {
    setLoading(true)
    let query = supabase.from('theater_records').select('*, characters(id,name,avatar)', { count: 'exact' })
    if (search) query = query.or(`title.ilike.%${search}%,extra_tag.ilike.%${search}%,content.ilike.%${search}%`)
    if (activeChar) query = query.eq('character_id', activeChar)
    const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    setRecords((data as any) || [])
    setTotal(count || 0)
    setLoading(false)
  }

  function selectChar(id: string | null) { setActiveChar(id); setPage(1) }

  // ---------- 图片上传 / 排序 ----------
  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    const fileArr = Array.from(files)
    const placeholders: DraftImage[] = fileArr.map(() => ({ url: '', caption: '', uploading: true }))
    const startIndex = draftImages.length
    setDraftImages(prev => [...prev, ...placeholders])

    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i]
      const ext = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('theater-images').upload(path, file)
      if (error) { console.error('上传失败', error); continue }
      const { data: urlData } = supabase.storage.from('theater-images').getPublicUrl(path)
      setDraftImages(prev => {
        const next = [...prev]
        next[startIndex + i] = { url: urlData.publicUrl, caption: '', uploading: false }
        return next
      })
    }
  }

  function updateCaption(index: number, caption: string) {
    setDraftImages(prev => { const next = [...prev]; next[index] = { ...next[index], caption }; return next })
  }
  function removeDraftImage(index: number) {
    setDraftImages(prev => prev.filter((_, i) => i !== index))
  }
  function moveImage(index: number, dir: -1 | 1) {
    setDraftImages(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return next
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  // ---------- 新角色 ----------
  async function handleNewCharAvatar(files: FileList | null) {
    if (!files || files.length === 0) return
    setNewCharUploading(true)
    const file = files[0]
    const ext = file.name.split('.').pop()
    const path = `char-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('theater-images').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('theater-images').getPublicUrl(path)
      setNewCharAvatar(urlData.publicUrl)
    }
    setNewCharUploading(false)
  }

  async function saveNewCharacter() {
    if (!newCharName.trim()) return
    setSavingNewChar(true)
    const { data } = await supabase.from('characters').insert({ name: newCharName.trim(), avatar: newCharAvatar || null }).select().single()
    if (data) {
      setCharacters(prev => [...prev, data as Character])
      setNewRecord(p => ({ ...p, character_id: data.id }))
    }
    setNewCharName(''); setNewCharAvatar(''); setShowNewCharForm(false); setCharDropdownOpen(false)
    setSavingNewChar(false)
  }

  // ---------- markdown 快捷按钮 ----------
  function insertMarkdown(type: 'bold' | 'quote' | 'strike' | 'ul' | 'ol') {
    const ta = contentRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = newRecord.content
    const selected = value.slice(start, end)
    let insertText = ''
    if (type === 'bold') {
      insertText = selected ? `**${selected}**` : '****'
    } else if (type === 'quote') {
      insertText = selected ? selected.split('\n').map(l => `> ${l}`).join('\n') : '> '
    } else if (type === 'strike') {
      insertText = selected ? `~~${selected}~~` : '~~~~'
    } else if (type === 'ul') {
      insertText = selected ? selected.split('\n').map(l => `- ${l}`).join('\n') : '- '
    } else if (type === 'ol') {
      insertText = selected ? selected.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') : '1. '
    }
    const nextValue = value.slice(0, start) + insertText + value.slice(end)
    setNewRecord(p => ({ ...p, content: nextValue }))
    requestAnimationFrame(() => {
      ta.focus()
      const pos = selected ? start + insertText.length : (type === 'bold' ? start + 2 : start + 2)
      ta.selectionStart = ta.selectionEnd = pos
    })
  }

  function insertRawText(text: string) {
    setNewRecord(p => ({ ...p, content: p.content ? `${p.content}\n\n${text}\n` : `${text}\n` }))
  }

  async function saveRecord() {
    if (!newRecord.title || !newRecord.character_id) return
    setSaving(true)
    const images = draftImages.filter(img => !img.uploading && img.url).map(img => ({ url: img.url, caption: img.caption || '' }))
    await supabase.from('theater_records').insert({
      character_id: newRecord.character_id,
      card_id: newRecord.card_id || null,
      title: newRecord.title,
      extra_tag: newRecord.extra_tag || null,
      content: newRecord.content || null,
      images,
    })
    setNewRecord({ character_id: '', card_id: '', title: '', extra_tag: '', content: '' })
    setDraftImages([])
    setCardSearch('')
    setShowAdd(false)
    setSaving(false)
    fetchRecords()
    fetchCardOptions()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const selectedChar = characters.find(c => c.id === newRecord.character_id)
  const selectedCard = cardOptions.find(c => c.id === newRecord.card_id)
  const filteredCardOptions = cardOptions.filter(c => c.title.toLowerCase().includes(cardSearch.toLowerCase()))

  const tagBtnStyle = (active: boolean) => ({
    padding: '4px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid', cursor: 'pointer',
    background: active ? '#1a1a1a' : '#f5f5f3', color: active ? '#fff' : '#999',
    borderColor: active ? '#1a1a1a' : '#e8e8e6',
  } as React.CSSProperties)

  const CharFilter = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      <button onClick={() => selectChar(null)} style={tagBtnStyle(activeChar === null)}>全部</button>
      {(charsExpanded ? characters : characters.slice(0, 5)).map(c => (
        <button key={c.id} onClick={() => selectChar(c.id)} style={{ ...tagBtnStyle(activeChar === c.id), display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 4px' }}>
          {c.avatar ? <img src={c.avatar} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e8e8e6' }} />}
          {c.name}
        </button>
      ))}
      {characters.length > 5 && (
        <button onClick={() => setCharsExpanded(v => !v)} style={{ fontSize: '11px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {charsExpanded ? '收起' : `更多 (${characters.length})`}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ transform: charsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
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
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 500 }}>+{remaining}</div>
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
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { scrollbar-width: none; -ms-overflow-style: none; }
        .md-btn { background:#f5f5f3;border:1px solid #ebebeb;border-radius:6px;padding:4px 10px;font-size:12px;color:#666;cursor:pointer; }
        .md-btn:hover { background:#eaeae8; }
        @media(max-width:768px){
          .sidebar-desktop{display:none!important}
          .mobile-nav{display:flex!important}
          .main-content{margin-left:0!important;padding:16px!important;padding-bottom:80px!important}
          .cards-grid{columns:1!important}
          .top-bar{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
        }
        @media(min-width:769px){
          .mobile-nav{display:none!important}
          .filter-float{display:none!important}
        }
      `}</style>

      <aside className="sidebar-desktop" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px', background: '#fff', borderRight: '1px solid #f0f0ee', display: 'flex', flexDirection: 'column', padding: '32px 0', zIndex: 40 }}>
        <div onClick={() => router.push('/')} style={{ padding: '0 24px 28px', fontFamily: 'Noto Serif SC,serif', fontSize: '20px', fontWeight: 300, letterSpacing: '0.2em', color: '#1a1a1a', cursor: 'pointer' }}>Yuria</div>
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
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>
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
          <div className="cards-grid" style={{ columns: 3, columnGap: '16px' }}>
            {records.map(r => (
              <div key={r.id} className="card-item" onClick={() => router.push(`/notes/records/${r.id}`)}
                style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0ee', padding: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', breakInside: 'avoid', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  {r.characters?.avatar ? <img src={r.characters.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e8e8e6' }} />}
                  <span style={{ fontSize: '13px', color: '#666' }}>{r.characters?.name || '未命名'}</span>
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #ebebeb', background: '#fff', color: page === 1 ? '#ccc' : '#333', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>← 上一页</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return <button key={p} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid', borderColor: p === page ? '#1a1a1a' : '#ebebeb', background: p === page ? '#1a1a1a' : '#fff', color: p === page ? '#fff' : '#333', cursor: 'pointer', fontSize: '13px' }}>{p}</button>
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #ebebeb', background: '#fff', color: page === totalPages ? '#ccc' : '#333', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>下一页 →</button>
          </div>
        )}
      </div>

      <nav className="mobile-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '0.5px solid #ebebeb', padding: '10px 0', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', justifyContent: 'space-around', zIndex: 50 }}>
        {[{ label: '主页', path: '/', active: false },{ label: '词库', path: '/notes/library', active: false }, { label: '记录', path: '/notes/records', active: true }].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', flex: 1, color: item.active ? '#1a1a1a' : '#bbb' }}>
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

      {/* 新增记录弹窗 */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => { setShowAdd(false); setCharDropdownOpen(false); setCardDropdownOpen(false) }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: 'min(560px,100%)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Noto Serif SC,serif', fontWeight: 300, fontSize: '18px', color: '#1a1a1a', margin: '0 0 20px' }}>新增记录</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* 角色下拉选择 */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>角色 *</label>
                <div onClick={() => { setCharDropdownOpen(v => !v); setCardDropdownOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ebebeb', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', cursor: 'pointer', color: selectedChar ? '#1a1a1a' : '#bbb' }}>
                  {selectedChar ? (
                    <>
                      {selectedChar.avatar ? <img src={selectedChar.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e8e8e6' }} />}
                      {selectedChar.name}
                    </>
                  ) : '点击选择角色'}
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>

                {charDropdownOpen && (
                  <div className="scroll-hide" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid #ebebeb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: '240px', overflowY: 'auto', zIndex: 10 }}>
                    {!showNewCharForm ? (
                      <>
                        <div onClick={() => setShowNewCharForm(true)}
                          style={{ padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', fontWeight: 500, cursor: 'pointer', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          新角色
                        </div>
                        {characters.map(c => (
                          <div key={c.id} onClick={() => { setNewRecord(p => ({ ...p, character_id: c.id })); setCharDropdownOpen(false) }}
                            style={{ padding: '9px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: newRecord.character_id === c.id ? '#1a1a1a' : '#555', background: newRecord.character_id === c.id ? '#f5f5f3' : '#fff' }}>
                            {c.avatar ? <img src={c.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e8e8e6' }} />}
                            {c.name}
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>新建角色</div>
                        <input value={newCharName} onChange={e => setNewCharName(e.target.value)} placeholder="角色名字"
                          style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', outline: 'none', marginBottom: '8px' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#999', cursor: 'pointer', marginBottom: '10px' }}>
                          {newCharAvatar
                            ? <img src={newCharAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>}
                          {newCharUploading ? '上传中...' : '上传头像（可选）'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleNewCharAvatar(e.target.files)} />
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { setShowNewCharForm(false); setNewCharName(''); setNewCharAvatar('') }}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ebebeb', background: '#fff', color: '#666', fontSize: '12px', cursor: 'pointer' }}>取消</button>
                          <button onClick={saveNewCharacter} disabled={!newCharName.trim() || savingNewChar}
                            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: !newCharName.trim() || savingNewChar ? '#f0f0ee' : '#1a1a1a', color: !newCharName.trim() || savingNewChar ? '#aaa' : '#fff', fontSize: '12px', cursor: 'pointer' }}>
                            {savingNewChar ? '保存中' : '保存角色'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 关联词库下拉 */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>关联词库（可选）</label>
                <div onClick={() => { setCardDropdownOpen(v => !v); setCharDropdownOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ebebeb', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', cursor: 'pointer', color: selectedCard ? '#1a1a1a' : '#bbb' }}>
                  {selectedCard ? selectedCard.title : '点击查看词库列表'}
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>

                {cardDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid #ebebeb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 10, padding: '8px' }}>
                    <input value={cardSearch} onChange={e => setCardSearch(e.target.value)} placeholder="搜索词库标题..." autoFocus
                      style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', outline: 'none', marginBottom: '6px' }} />
                    <div className="scroll-hide" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {newRecord.card_id && (
                        <div onClick={() => { setNewRecord(p => ({ ...p, card_id: '' })); setCardDropdownOpen(false) }}
                          style={{ padding: '8px 10px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}>取消关联</div>
                      )}
                      {filteredCardOptions.length === 0 ? (
                        <div style={{ padding: '10px', fontSize: '12px', color: '#ccc', textAlign: 'center' }}>没有找到词库</div>
                      ) : filteredCardOptions.map(c => (
                        <div key={c.id} onClick={() => { setNewRecord(p => ({ ...p, card_id: c.id })); setCardDropdownOpen(false) }}
                          style={{ padding: '8px 10px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', color: newRecord.card_id === c.id ? '#1a1a1a' : '#666', background: newRecord.card_id === c.id ? '#f5f5f3' : '#fff' }}>
                          {c.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>标题 *</label>
                <input value={newRecord.title} onChange={e => setNewRecord(p => ({ ...p, title: e.target.value }))} placeholder="标题"
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>副标题</label>
                <input value={newRecord.extra_tag} onChange={e => setNewRecord(p => ({ ...p, extra_tag: e.target.value }))} placeholder="副标题"
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none' }} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#aaa' }}>正文</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="md-btn" onClick={() => insertMarkdown('bold')}><strong>B</strong> 加粗</button>
                    <button type="button" className="md-btn" onClick={() => insertMarkdown('quote')}>&ldquo;&rdquo; 引用</button>
                    <button type="button" className="md-btn" onClick={() => insertMarkdown('strike')}><s>S</s> 删除线</button>
                    <button type="button" className="md-btn" onClick={() => insertMarkdown('ul')}>• 列表</button>
                    <button type="button" className="md-btn" onClick={() => insertMarkdown('ol')}>1. 列表</button>
                    <button type="button" className="md-btn" onClick={() => setShowTableBuilder(true)}>⊞ 表格</button>
                  </div>
                </div>
                <textarea ref={contentRef} value={newRecord.content} onChange={e => setNewRecord(p => ({ ...p, content: e.target.value }))} rows={7}
                  placeholder="在这里写正文...（选中文字后点上方按钮可快速加粗/引用）"
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>图片</label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px dashed #ccc', borderRadius: '10px', padding: '14px', fontSize: '12px', color: '#999', cursor: 'pointer', marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  点击上传图片（可多选）
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files)} />
                </label>

                {draftImages.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {draftImages.map((img, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fafaf8', borderRadius: '10px', padding: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button onClick={() => moveImage(i, -1)} disabled={i === 0}
                            style={{ background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer', color: i === 0 ? '#e0e0e0' : '#999', padding: '2px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
                          </button>
                          <button onClick={() => moveImage(i, 1)} disabled={i === draftImages.length - 1}
                            style={{ background: 'none', border: 'none', cursor: i === draftImages.length - 1 ? 'not-allowed' : 'pointer', color: i === draftImages.length - 1 ? '#e0e0e0' : '#999', padding: '2px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                          </button>
                        </div>
                        <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', background: '#eee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {img.uploading ? <span style={{ fontSize: '10px', color: '#aaa' }}>上传中</span> : <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <input value={img.caption || ''} onChange={e => updateCaption(i, e.target.value)} placeholder="这张图的备注（可选）"
                          style={{ flex: 1, border: '1px solid #ebebeb', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', outline: 'none' }} />
                        <button onClick={() => removeDraftImage(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '4px', flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setShowAdd(false); setDraftImages([]) }}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #ebebeb', background: '#fff', color: '#666', fontSize: '13px', cursor: 'pointer' }}>取消</button>
              <button onClick={saveRecord} disabled={saving || !newRecord.title || !newRecord.character_id}
                style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: saving || !newRecord.title || !newRecord.character_id ? '#f0f0ee' : '#1a1a1a', color: saving || !newRecord.title || !newRecord.character_id ? '#aaa' : '#fff', fontSize: '13px', cursor: saving || !newRecord.title || !newRecord.character_id ? 'not-allowed' : 'pointer' }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 表格构建器 */}
      {showTableBuilder && (
        <TableBuilderModal
          onInsert={(md) => insertRawText(md)}
          onClose={() => setShowTableBuilder(false)}
        />
      )}
    </div>
  )
}

