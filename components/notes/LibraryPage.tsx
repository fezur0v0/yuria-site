'use client'
import NotesNavigation from './NotesNavigation'
import NotesPagination from './NotesPagination'
import notesStyles from './notes-shell.module.css'
import { FiPlus, FiMinus } from 'react-icons/fi'
import PrivateTheaterImage from '@/components/notes/PrivateTheaterImage'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/content/client'

const supabase = createClient()

type Card = {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  author: string | null
  created_at: string
}

type CharacterGroup = {
  character_id: string
  name: string
  avatar: string | null
  records: { id: string; title: string }[]
}

const MAIN_CATEGORIES = ['html', '小手机', '番外']
const PAGE_SIZE = 12

function TagInput({ tags, onChange }: { tags: string[], onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')

  // 抽离新增逻辑
  function addTag() {
    const value = input.trim()
    if (!value) return
    if (tags.includes(value)) return // 去重
    onChange([...tags, value])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()    // 防止触发表单提交
      addTag()
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
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}   // 👈 关键：失焦时自动新增
        placeholder={tags.length === 0 ? '输入标签后按回车...' : ''}
        style={{ border: 'none', outline: 'none', fontSize: '13px', minWidth: '80px', flex: 1, background: 'transparent', maxWidth: '100%' }}
      />
    </div>
  )
}


export default function Library() {
  const router = useRouter()
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const latestRead = useRef(0)
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<Record<string, 'include' | 'exclude'>>({})
  const [allTags, setAllTags] = useState<string[]>([])
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [relatedGroups, setRelatedGroups] = useState<Record<string, CharacterGroup[]>>({})
  const [expandedCharPerCard, setExpandedCharPerCard] = useState<Record<string, string | null>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newCard, setNewCard] = useState({ title: '', content: '', category: '', author: '', tags: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [editForm, setEditForm] = useState({ title: '', content: '', category: '', author: '', tags: [] as string[] })
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    fetchCards()
    fetchAllTags()
  }, [page, search, selectedTags])

  async function fetchCards() {
    const read = ++latestRead.current
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
    if (read !== latestRead.current) return
    setTotal(count || 0)
    const lastPage = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
    if (page > lastPage) { setPage(lastPage); return }
    setCards(data || [])
    setLoading(false)
  }

  async function fetchAllTags() {
    const { data } = await supabase.from('theater_cards').select('tags')
    if (!data) return
    const tagSet = new Set<string>()
    data.forEach((r: any) => r.tags?.forEach((t: string) => { if (!MAIN_CATEGORIES.includes(t)) tagSet.add(t) }))
    setAllTags(Array.from(tagSet))
  }

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
    await supabase.from('theater_cards').insert({ title: newCard.title, content: newCard.content, category: newCard.category || null, tags: newCard.tags, author: newCard.author || null })
    setNewCard({ title: '', content: '', category: '', author: '', tags: [] })
    setShowAdd(false)
    setSaving(false)
    fetchCards(); fetchAllTags()
  }

  function openEdit(card: Card, e: React.MouseEvent) {
    e.stopPropagation()
    setEditCard(card)
    setEditForm({ title: card.title, content: card.content, category: card.category || '', author: card.author || '', tags: card.tags || [] })
  }

  async function saveEdit() {
    if (!editCard) return
    setEditSaving(true)
    await supabase.from('theater_cards').update({ title: editForm.title, content: editForm.content, category: editForm.category || null, tags: editForm.tags, author: editForm.author || null, updated_at: new Date().toISOString() }).eq('id', editCard.id)
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

  const matchingTags = allTags.filter(tag => tag.toLocaleLowerCase().includes(tagSearch.trim().toLocaleLowerCase()))
  const filterChip = (tag: string) => <button type="button" key={tag} data-state={selectedTags[tag]} aria-label={`${tag}：${selectedTags[tag] === 'include' ? '包含' : selectedTags[tag] === 'exclude' ? '排除' : '未筛选'}`} onClick={() => toggleTag(tag)}>{tag}</button>
  const filterPanel = <>
    <section className={notesStyles.filterSection}><h3>分类</h3><div className={notesStyles.chips}>{MAIN_CATEGORIES.map(filterChip)}</div></section>
    <section className={notesStyles.filterSection}>
      <div className={notesStyles.filterTitle}><h3>标签</h3><input className={notesStyles.filterInput} aria-label="搜索标签" type="search" value={tagSearch} onChange={e => setTagSearch(e.target.value)} placeholder="搜索标签…" /></div>
      <div className={notesStyles.chips}>{(tagsExpanded || tagSearch ? matchingTags : matchingTags.slice(0, 16)).map(filterChip)}</div>
      {matchingTags.length === 0 && <p className={notesStyles.filterHint}>{allTags.length ? '没有找到这个标签' : '还没有标签'}</p>}
      {!tagSearch && matchingTags.length > 16 && <button type="button" className={notesStyles.expandTags} aria-expanded={tagsExpanded} title={tagsExpanded ? '收起标签' : '展开全部标签'} onClick={() => setTagsExpanded(value => !value)}><span>{tagsExpanded ? 'less' : 'more'}</span>{tagsExpanded ? <FiMinus size={14} aria-hidden="true" /> : <FiPlus size={14} aria-hidden="true" />}</button>}
    </section>
    <p className={notesStyles.filterHint}>点击包含，再次点击排除，再次点击取消。</p>
    {Object.keys(selectedTags).length > 0 && <button type="button" className={notesStyles.more} onClick={() => { setSelectedTags({}); setPage(1) }}>清空筛选</button>}
  </>

  return (
    <div className={notesStyles.page}>
      <NotesNavigation active="library" search={search} onSearch={value => { setSearch(value); setPage(1) }} filterCount={Object.keys(selectedTags).length} filterContent={filterPanel} />
      <main className={notesStyles.main}>
        <div className={notesStyles.heading}>
          <h1>词库</h1>
          <button type="button" className={notesStyles.addButton} aria-label="新增词库" onClick={() => setShowAdd(true)}><FiPlus size={23} /></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>加载中...</div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>暂无内容</div>
        ) : (
          <div className={notesStyles.cardGrid}>
            {cards.map(card => {
              const isExpanded = expandedId === card.id
              const groups = relatedGroups[card.id] || []
              const expandedChar = expandedCharPerCard[card.id]
              return (
                <div key={card.id} className="card-item"
                  style={{ background: '#fff', borderRadius: '16px', border: `1px solid ${isExpanded ? '#e0e0de' : '#f0f0ee'}`, padding: '20px', cursor: 'pointer', boxShadow: isExpanded ? '0 4px 24px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s', overflowWrap: 'anywhere', minWidth: 0 }}
                  onClick={() => handleCardClick(card)}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</div>
                      {card.author && <div style={{ fontSize: '12px', color: '#999', marginBottom: '2px' }}>by {card.author}</div>}
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

                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.7, overflow: 'hidden', maxHeight: isExpanded ? 'none' : '72px', maskImage: isExpanded ? 'none' : 'linear-gradient(to bottom,black 50%,transparent)', WebkitMaskImage: isExpanded ? 'none' : 'linear-gradient(to bottom,black 50%,transparent)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', marginBottom: '12px' }}>
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
                                    ? <PrivateTheaterImage src={g.avatar} alt={g.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
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

        <NotesPagination page={page} totalPages={totalPages} onChange={setPage} />
      </main>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowAdd(false)}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setEditCard(null)}>
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
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>作者</label>
                <input value={editForm.author} onChange={e => setEditForm(p => ({ ...p, author: e.target.value }))} placeholder="Yuria"
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
