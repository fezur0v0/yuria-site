'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type Card = {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
}

type CharacterGroup = {
  character_id: string
  name: string
  avatar: string | null
  records: { id: string; title: string }[]
}

const MAIN_CATEGORIES = ['html', '小手机', '番外']
const PAGE_SIZE = 10

function TagInput({ tags, onChange }: { tags: string[], onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) onChange([...tags, input.trim()])
      setInput('')
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', border: '1px solid #ebebeb', borderRadius: '10px', padding: '8px 12px', minHeight: '42px', cursor: 'text' }}
      onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {tags.map(t => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f5f5f3', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', color: '#555' }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '0 1px', fontSize: '13px', lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#aaa'}>×</button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? '输入标签后按回车...' : ''}
        style={{ border: 'none', outline: 'none', fontSize: '13px', minWidth: '80px', flex: 1, background: 'transparent' }} />
    </div>
  )
}

export default function Library() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<Record<string, 'include' | 'exclude'>>({})
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [relatedGroups, setRelatedGroups] = useState<Record<string, CharacterGroup[]>>({})
  const [expandedCharPerCard, setExpandedCharPerCard] = useState<Record<string, string | null>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newCard, setNewCard] = useState({ title: '', content: '', category: '', author: '', tags: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [editForm, setEditForm] = useState({ title: '', content: '', category: '', tags: [] as string[] })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('notes_auth') !== 'true') {
      router.replace('/notes'); return
    }
    fetchCards()
    fetchAllTags()
  }, [page, search, selectedTags])

  async function fetchCards() {
    setLoading(true)
    let query = supabase.from('theater_cards').select('*', { count: 'exact' })
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)

    const includeTags = Object.entries(selectedTags).filter(([k, v]) => v === 'include' && !MAIN_CATEGORIES.includes(k)).map(([k]) => k)
    const excludeTags = Object.entries(selectedTags).filter(([k, v]) => v === 'exclude' && !MAIN_CATEGORIES.includes(k)).map(([k]) => k)
    if (includeTags.length > 0) query = query.contains('tags', includeTags)
    excludeTags.forEach(tag => { query = query.not('tags', 'cs', `{${tag}}`) })

    const mainInclude = MAIN_CATEGORIES.filter(c => selectedTags[c] === 'include')
    const mainExclude = MAIN_CATEGORIES.filter(c => selectedTags[c] === 'exclude')
    if (mainInclude.length > 0) query = query.in('category', mainInclude)
    mainExclude.forEach(category => { query = query.neq('category', category) })

    const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    setCards(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function fetchAllTags() {
    const { data } = await supabase.from('theater_cards').select('tags')
    if (!data) return
    const tagSet = new Set<string>()
    data.forEach((r: any) => r.tags?.forEach((t: string) => { if (!MAIN_CATEGORIES.includes(t)) tagSet.add(t) }))
    setAllTags(Array.from(tagSet))
  }

  // 按角色分组：查出所有关联该词库的记录（带角色信息），再按 character_id 分组
  async function fetchRelated(cardId: string) {
    if (relatedGroups[cardId]) return
    const { data } = await supabase
      .from('theater_records')
      .select('id,title,character_id,characters(id,name,avatar)')
      .eq('card_id', cardId)

    const groups: Record<string, CharacterGroup> = {}
    ;(data || []).forEach((r: any) => {
      const char = r.characters
      const key = char?.id || 'unknown'
      if (!groups[key]) {
        groups[key] = { character_id: key, name: char?.name || '未命名角色', avatar: char?.avatar || null, records: [] }
      }
      groups[key].records.push({ id: r.id, title: r.title })
    })

    setRelatedGroups(prev => ({ ...prev, [cardId]: Object.values(groups) }))
  }

  function toggleCharExpand(cardId: string, characterId: string) {
    setExpandedCharPerCard(prev => ({
      ...prev,
      [cardId]: prev[cardId] === characterId ? null : characterId,
    }))
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev => {
      const cur = prev[tag]
      if (!cur) return { ...prev, [tag]: 'include' }
      if (cur === 'include') return { ...prev, [tag]: 'exclude' }
      const next = { ...prev }; delete next[tag]; return next
    })
    setPage(1)
  }

  async function addCard() {
    if (!newCard.title) return
    setSaving(true)
    await supabase.from('theater_cards').insert({ title: newCard.title, content: newCard.content, category: newCard.category || null, tags: newCard.tags })
    setNewCard({ title: '', content: '', category: '', author: '', tags: [] })
    setShowAdd(false)
    setSaving(false)
    fetchCards(); fetchAllTags()
  }

  function openEdit(card: Card, e: React.MouseEvent) {
    e.stopPropagation()
    setEditCard(card)
    setEditForm({ title: card.title, content: card.content, category: card.category || '', tags: card.tags || [] })
  }

  async function saveEdit() {
    if (!editCard) return
    setEditSaving(true)
    await supabase.from('theater_cards').update({ title: editForm.title, content: editForm.content, category: editForm.category || null, tags: editForm.tags, updated_at: new Date().toISOString() }).eq('id', editCard.id)
    setEditCard(null)
    setEditSaving(false)
    fetchCards(); fetchAllTags()
  }

  async function deleteCard(id: string) {
    if (!confirm('确定删除这张卡片？')) return
    await supabase.from('theater_cards').delete().eq('id', id)
    fetchCards()
  }

  async function copyContent(content: string, id: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleCardClick(card: Card) {
    if (expandedId === card.id) { setExpandedId(null); return }
    setExpandedId(card.id)
    fetchRelated(card.id)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const tagBtnStyle = (tag: string) => {
    const s = selectedTags[tag]
    return {
      padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
      border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
      background: s === 'include' ? '#1a1a1a' : '#f5f5f3',
      color: s === 'include' ? '#fff' : '#999',
      borderColor: s === 'include' ? '#1a1a1a' : '#e8e8e6',
      textDecoration: s === 'exclude' ? 'line-through' : 'none',
      opacity: s === 'exclude' ? 0.5 : 1,
    } as React.CSSProperties
  }

  const FilterPanel = () => (
    <div style={{ fontSize: '13px' }}>
      <div style={{ color: '#aaa', fontSize: '11px', letterSpacing: '0.15em', marginBottom: '12px' }}>主要分类</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {MAIN_CATEGORIES.map(c => <button key={c} onClick={() => toggleTag(c)} style={tagBtnStyle(c)}>{c}</button>)}
      </div>
      {allTags.length > 0 && <>
        <div style={{ color: '#aaa', fontSize: '11px', letterSpacing: '0.15em', marginBottom: '12px' }}>其他标签</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(tagsExpanded ? allTags : allTags.slice(0, 6)).map(t => <button key={t} onClick={() => toggleTag(t)} style={tagBtnStyle(t)}>{t}</button>)}
        </div>
       {allTags.length > 6 && <button onClick={() => setTagsExpanded(v => !v)} style={{ marginTop: '8px', fontSize: '11px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
  {tagsExpanded ? '收起' : `展开全部 (${allTags.length})`}
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    style={{ transform: tagsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
    <path d="M6 9l6 6 6-6"/>
  </svg>
</button>}
      </>}
      {Object.keys(selectedTags).length > 0 && <button onClick={() => { setSelectedTags({}); setPage(1) }} style={{ marginTop: '16px', fontSize: '11px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block' }}>清空选中</button>}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafaf8', fontFamily: 'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto Serif SC:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .card-item { transition: box-shadow 0.2s, transform 0.2s; }
        .card-item:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important; }
        .sb-link { display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;cursor:pointer;color:#888;font-size:13px;text-decoration:none;transition:all 0.2s;background:transparent;border:none;width:100%;font-family:Inter,sans-serif; }
        .sb-link:hover,.sb-link.active { color:#1a1a1a;background:#f0f0ee; }
        .sb-link.active { font-weight:500; }
        .sidebar-desktop { width: 260px !important; }
        .main-content { margin-left: 260px !important; }
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
        <div onClick={() => router.push('/')} style={{ padding: '0 24px 28px', fontFamily: 'Noto Serif SC,serif', fontSize: '20px', fontWeight: 300, letterSpacing: '0.2em', color: '#1a1a1a', cursor: 'pointer' }}>Yuria</div>
        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button className="sb-link active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            词库
          </button>
          <button className="sb-link" onClick={() => router.push('/notes/records')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            记录
          </button>
        </nav>
        <div style={{ padding: '28px 20px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ color: '#aaa', fontSize: '11px', letterSpacing: '0.2em', marginBottom: '16px' }}>分类筛选</div>
          <FilterPanel />
        </div>
      </aside>

      <div className="main-content" style={{ marginLeft: '260px', flex: 1, padding: '32px 40px', paddingBottom: '60px' }}>
        <div className="top-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Noto Serif SC,serif', fontSize: '24px', fontWeight: 300, letterSpacing: '0.1em', color: '#1a1a1a', margin: 0 }}>词库</h1>
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            新增小剧场
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="搜索标题、内容、标签..."
            style={{ width: '100%', padding: '11px 14px 11px 40px', border: '1px solid #ebebeb', borderRadius: '12px', fontSize: '13px', color: '#333', background: '#fff', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#1a1a1a'}
            onBlur={e => e.target.style.borderColor = '#ebebeb'} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>加载中...</div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>暂无内容</div>
        ) : (
          <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {cards.map(card => {
              const isExpanded = expandedId === card.id
              const groups = relatedGroups[card.id] || []
              const expandedChar = expandedCharPerCard[card.id]
              return (
                <div key={card.id} className="card-item"
                  style={{ background: '#fff', borderRadius: '16px', border: `1px solid ${isExpanded ? '#e0e0de' : '#f0f0ee'}`, padding: '20px', cursor: 'pointer', boxShadow: isExpanded ? '0 4px 24px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
                  onClick={() => handleCardClick(card)}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</div>
                      <div style={{ fontSize: '11px', color: '#bbb' }}>{new Date(card.created_at).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', flexShrink: 0 }}>
                      <button onClick={e => openEdit(card, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ccc', borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#1a1a1a'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteCard(card.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ccc', borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.7, overflow: 'hidden', maxHeight: isExpanded ? 'none' : '72px', maskImage: isExpanded ? 'none' : 'linear-gradient(to bottom,black 50%,transparent)', WebkitMaskImage: isExpanded ? 'none' : 'linear-gradient(to bottom,black 50%,transparent)', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                    {card.content}
                  </div>

                  {card.tags?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      {card.tags.map(t => <span key={t} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#f5f5f3', color: '#888' }}>{t}</span>)}
                    </div>
                  )}

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f0f0ee', paddingTop: '12px', marginBottom: '12px' }} onClick={e => e.stopPropagation()}>
                      {groups.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', padding: '8px 0' }}>暂无关联记录</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '10px', letterSpacing: '0.1em' }}>关联角色</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {groups.map(g => (
                              <div key={g.character_id}>
                                <button onClick={() => toggleCharExpand(card.id, g.character_id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 10px', borderRadius: '10px', border: '1px solid #f0f0ee', background: expandedChar === g.character_id ? '#f5f5f3' : '#fafaf8', cursor: 'pointer', fontSize: '12px', color: '#555' }}>
                                  {g.avatar
                                    ? <img src={g.avatar} alt={g.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                                    : <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e8e8e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#aaa' }}>{g.name?.[0]}</div>
                                  }
                                  <span style={{ flex: 1, textAlign: 'left' }}>{g.name}</span>
                                  <span style={{ color: '#bbb', fontSize: '11px' }}>{g.records.length} 条</span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"
                                    style={{ transform: expandedChar === g.character_id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                                    <path d="M6 9l6 6 6-6"/>
                                  </svg>
                                </button>
                                {expandedChar === g.character_id && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 0 2px 30px' }}>
                                    {g.records.map(r => (
                                      <button key={r.id} onClick={() => router.push(`/notes/records/${r.id}`)}
                                        style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#888', padding: '4px 0' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#1a1a1a'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#888'}>
                                        · {r.title}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div onClick={e => e.stopPropagation()}>
                    <button onClick={() => copyContent(card.content, card.id)}
                      style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #ebebeb', background: copied === card.id ? '#f0fdf4' : '#fff', color: copied === card.id ? '#22c55e' : '#666', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      {copied === card.id
                        ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>已复制</>
                        : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>复制内容</>
                      }
                    </button>
                  </div>
                </div>
              )
            })}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#aaa' }}>
              跳转到
              <input type="number" min={1} max={totalPages} defaultValue={page}
                onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value); if (v >= 1 && v <= totalPages) setPage(v) } }}
                style={{ width: '48px', padding: '6px 8px', border: '1px solid #ebebeb', borderRadius: '6px', fontSize: '12px', textAlign: 'center', outline: 'none' }} />
              页
            </div>
          </div>
        )}
      </div>

      <nav className="mobile-nav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '0.5px solid #ebebeb', padding: '10px 0', paddingBottom: 'max(10px,env(safe-area-inset-bottom))', justifyContent: 'space-around', zIndex: 50 }}>
        {[{ label: '主页', path: '/', active: false }, { label: '词库', path: '/notes/library', active: true }, { label: '记录', path: '/notes/records', active: false }].map(item => (
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
        style={{ position: 'fixed', bottom: '80px', left: '16px', width: '44px', height: '44px', borderRadius: '50%', background: Object.keys(selectedTags).length > 0 ? '#1a1a1a' : '#fff', border: '1px solid #e8e8e6', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 40, color: Object.keys(selectedTags).length > 0 ? '#fff' : '#666' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
      </button>

      {filterOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={() => setFilterOpen(false)}>
          <div style={{ position: 'absolute', bottom: '80px', left: '16px', background: '#fff', borderRadius: '16px', padding: '20px', width: 'min(280px,calc(100vw - 32px))', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <FilterPanel />
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowAdd(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: 'min(480px,100%)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Noto Serif SC,serif', fontWeight: 300, fontSize: '18px', color: '#1a1a1a', margin: '0 0 20px' }}>新增小剧场</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>标题</label>
                <input value={newCard.title} onChange={e => setNewCard(p => ({ ...p, title: e.target.value }))} placeholder="标题"
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>作者</label>
                <input value={newCard.author} onChange={e => setNewCard(p => ({ ...p, author: e.target.value }))} placeholder="Yuria"
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>主要分类</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {MAIN_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setNewCard(p => ({ ...p, category: p.category === c ? '' : c }))}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', fontSize: '12px', cursor: 'pointer', background: newCard.category === c ? '#1a1a1a' : '#f5f5f3', color: newCard.category === c ? '#fff' : '#666', borderColor: newCard.category === c ? '#1a1a1a' : '#ebebeb' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>标签</label>
                <TagInput tags={newCard.tags} onChange={tags => setNewCard(p => ({ ...p, tags }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>内容</label>
                <textarea value={newCard.content} onChange={e => setNewCard(p => ({ ...p, content: e.target.value }))} placeholder="在这里写小剧场内容..." rows={7}
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #ebebeb', background: '#fff', color: '#666', fontSize: '13px', cursor: 'pointer' }}>取消</button>
              <button onClick={addCard} disabled={saving || !newCard.title} style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: saving || !newCard.title ? '#f0f0ee' : '#1a1a1a', color: saving || !newCard.title ? '#aaa' : '#fff', fontSize: '13px', cursor: saving || !newCard.title ? 'not-allowed' : 'pointer' }}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editCard && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setEditCard(null)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: 'min(480px,100%)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Noto Serif SC,serif', fontWeight: 300, fontSize: '18px', color: '#1a1a1a', margin: 0 }}>编辑词库</h2>
              <button onClick={() => { if (confirm('确定删除这张卡片？')) { deleteCard(editCard.id); setEditCard(null) } }}
                style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: '1px solid #fca5a5', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer' }}>
                删除词库
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>标题</label>
                <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="标题"
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>主要分类</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {MAIN_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setEditForm(p => ({ ...p, category: p.category === c ? '' : c }))}
                      style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', fontSize: '12px', cursor: 'pointer', background: editForm.category === c ? '#1a1a1a' : '#f5f5f3', color: editForm.category === c ? '#fff' : '#666', borderColor: editForm.category === c ? '#1a1a1a' : '#ebebeb' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>标签</label>
                <TagInput tags={editForm.tags} onChange={tags => setEditForm(p => ({ ...p, tags }))} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>内容</label>
                <textarea value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} rows={7}
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setEditCard(null)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #ebebeb', background: '#fff', color: '#666', fontSize: '13px', cursor: 'pointer' }}>取消</button>
              <button onClick={saveEdit} disabled={editSaving || !editForm.title} style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: editSaving || !editForm.title ? '#f0f0ee' : '#1a1a1a', color: editSaving || !editForm.title ? '#aaa' : '#fff', fontSize: '13px', cursor: editSaving || !editForm.title ? 'not-allowed' : 'pointer' }}>
                {editSaving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
