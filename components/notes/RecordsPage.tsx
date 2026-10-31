'use client'
import { uploadPrivateImage } from '@/utils/content/privateUpload'
import NotesNavigation from './NotesNavigation'
import NotesPagination from './NotesPagination'
import notesStyles from './notes-shell.module.css'
import { FiPlus, FiCheck } from 'react-icons/fi'
import PrivateTheaterImage from '@/components/notes/PrivateTheaterImage'
import CharacterSelect from './CharacterSelect'
import RecordToolbar from './RecordToolbar'
import { theaterMediaUrl } from '@/utils/notes/media'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/content/client'
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
    .replace(/\*\*(.*?)\*\*/g, '$1')        // 加粗符号去掉，保留文字
    .replace(/~~(.*?)~~/g, '$1')            // 删除线符号去掉，保留文字
    .replace(/^>\s?/gm, '')                 // 引用符号去掉
    .replace(/^[-*]\s+/gm, '')              // 无序列表符号去掉
    .replace(/^\d+\.\s+/gm, '')             // 有序列表编号去掉
    .split('\n')
    .filter(line => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) // 整行去掉表格的分隔线（---那一行）
    .map(line => line.replace(/\|/g, ' ').trim())   // 表格竖线换成空格
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function Records() {
  const router = useRouter()
  const [records, setRecords] = useState<RecordRow[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const latestRead = useRef(0)
  const [search, setSearch] = useState('')
  const [activeChar, setActiveChar] = useState<string | null>(null)
  const [characterSearch, setCharacterSearch] = useState('')
  const [addingCharacter, setAddingCharacter] = useState(false)
  const [newCharError, setNewCharError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

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
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  // 角色下拉
  const [charDropdownOpen, setCharDropdownOpen] = useState(false)
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
    fetchCharacters()
    fetchCardOptions()
  }, [])

  useEffect(() => {
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
    const read = ++latestRead.current
    setLoading(true)
    let query = supabase.from('theater_records').select('*, characters(id,name,avatar)', { count: 'exact' })
    if (search) query = query.or(`title.ilike.%${search}%,extra_tag.ilike.%${search}%,content.ilike.%${search}%`)
    if (activeChar) query = query.eq('character_id', activeChar)
    const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (read !== latestRead.current) return
    setTotal(count || 0)
    const lastPage = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
    if (page > lastPage) { setPage(lastPage); return }
    setRecords((data as any) || [])
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
      const { error } = await uploadPrivateImage(path, file)
      if (error) { console.error('上传失败', error); continue }
      const privateUrl = theaterMediaUrl(path)
      setDraftImages(prev => {
        const next = [...prev]
        next[startIndex + i] = { url: privateUrl, caption: '', uploading: false }
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
  function reorderImages(fromIndex: number, toIndex: number) {
    setDraftImages(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  // ---------- 新角色 ----------
  async function handleNewCharAvatar(files: FileList | null) {
    if (!files || files.length === 0) return
    setNewCharUploading(true)
    setNewCharError('')
    try {
      const file = files[0]
      const ext = file.name.split('.').pop()
      const path = `char-${crypto.randomUUID()}.${ext}`
      const { error } = await uploadPrivateImage(path, file)
      if (error) throw error
      setNewCharAvatar(theaterMediaUrl(path))
    } catch { setNewCharError('头像上传失败，请重试。') }
    finally { setNewCharUploading(false) }
  }

  async function saveNewCharacter() {
    if (!newCharName.trim() || savingNewChar || newCharUploading) return
    setSavingNewChar(true)
    setNewCharError('')
    try {
      const { data, error } = await supabase.from('characters').insert({ name: newCharName.trim(), avatar: newCharAvatar || null }).select().single()
      if (error || !data) throw error || new Error('Unable to save character')
      setCharacters(prev => [...prev, data as Character])
      setNewRecord(prev => ({ ...prev, character_id: data.id }))
      setCharacterSearch('')
      setNewCharName(''); setNewCharAvatar(''); setCharDropdownOpen(false); setAddingCharacter(false)
    } catch { setNewCharError('角色未保存，请稍后重试。') }
    finally { setSavingNewChar(false) }
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
  const selectedCard = cardOptions.find(c => c.id === newRecord.card_id)
  const filteredCardOptions = cardOptions.filter(c => c.title.toLowerCase().includes(cardSearch.toLowerCase()))

  const matchingCharacters = characters.filter(character => character.name.toLocaleLowerCase().includes(characterSearch.trim().toLocaleLowerCase()))
  const characterPanel = addingCharacter ? <div className={notesStyles.characterForm}>
    <h3>新增角色</h3>
    <label>角色名字<input className={notesStyles.filterInput} value={newCharName} onChange={e => setNewCharName(e.target.value)} placeholder="角色名字" /></label>
    <label>头像（可选）{newCharAvatar && <PrivateTheaterImage src={newCharAvatar} alt="新角色头像预览" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />}<input type="file" accept="image/*" aria-label="上传角色头像" onChange={e => void handleNewCharAvatar(e.target.files)} disabled={newCharUploading || savingNewChar} /></label>
    {newCharUploading && <p role="status">头像上传中…</p>}
    {newCharError && <p role="alert">{newCharError}</p>}
    <div className={notesStyles.formActions}><button type="button" onClick={() => { setAddingCharacter(false); setNewCharError('') }} disabled={savingNewChar}>取消</button><button type="button" onClick={() => void saveNewCharacter()} disabled={!newCharName.trim() || savingNewChar || newCharUploading}>{savingNewChar ? '保存中…' : '保存角色'}</button></div>
  </div> : <>
    <div className={notesStyles.characterSearch}><input className={notesStyles.filterInput} type="search" aria-label="搜索角色" value={characterSearch} onChange={e => setCharacterSearch(e.target.value)} placeholder="搜索角色…" /><button type="button" className={notesStyles.addButton} aria-label="新增角色" onClick={() => { setAddingCharacter(true); setNewCharError('') }}><FiPlus size={23} /></button></div>
    <div className={notesStyles.characterList}>
      {matchingCharacters.map(character => <button type="button" key={character.id} aria-pressed={activeChar === character.id} onClick={() => selectChar(activeChar === character.id ? null : character.id)}><span className={notesStyles.characterAvatar} aria-hidden="true">{character.avatar ? <PrivateTheaterImage src={character.avatar} alt="" /> : character.name[0]}</span><span>{character.name}</span>{activeChar === character.id && <FiCheck size={17} className={notesStyles.selectedCheck} aria-hidden="true" />}</button>)}
    </div>
    {matchingCharacters.length === 0 && <p className={notesStyles.filterHint}>没有找到角色</p>}
  </>

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
              <PrivateTheaterImage src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
    <div className={notesStyles.page}>
      <NotesNavigation active="records" search={search} onSearch={value => { setSearch(value); setPage(1) }} filterCount={activeChar ? 1 : 0} filterContent={characterPanel} />
      <main className={notesStyles.main}>
        <div className={notesStyles.heading}>
          <h1>记录</h1>
          <button type="button" className={notesStyles.addButton} aria-label="新增记录" onClick={() => setShowAdd(true)}><FiPlus size={23} /></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>加载中...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '13px' }}>暂无记录</div>
        ) : (
          <div className={notesStyles.cardGrid}>
            {records.map(r => (
              <div key={r.id} className="card-item" onClick={() => router.push(`/notes/records/${r.id}`)}
                style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0ee', padding: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', breakInside: 'avoid', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  {r.characters?.avatar ? <PrivateTheaterImage src={r.characters.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e8e8e6' }} />}
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

        <NotesPagination page={page} totalPages={totalPages} onChange={setPage} />
      </main>

      {/* 新增记录弹窗 */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => { setShowAdd(false); setCharDropdownOpen(false); setCardDropdownOpen(false) }}>
          <div role="dialog" aria-modal="true" aria-label="新增记录" style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: 'min(560px,100%)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Noto Serif SC,serif', fontWeight: 300, fontSize: '18px', color: '#1a1a1a', margin: '0 0 20px' }}>新增记录</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>角色 *</label>
                <CharacterSelect characters={characters} value={newRecord.character_id} open={charDropdownOpen} onOpenChange={open => { setCharDropdownOpen(open); if (open) setCardDropdownOpen(false) }} onChange={id => setNewRecord(previous => ({ ...previous, character_id: id }))} />
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
                <RecordToolbar onFormat={insertMarkdown} onTable={() => setShowTableBuilder(true)} />
                <textarea aria-label="记录正文" ref={contentRef} value={newRecord.content} onChange={e => setNewRecord(p => ({ ...p, content: e.target.value }))} rows={7}
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
                      <div key={i}
                        draggable
                        onDragStart={() => setDraggedImageIndex(i)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => {
                          if (draggedImageIndex !== null && draggedImageIndex !== i) {
                            reorderImages(draggedImageIndex, i)
                          }
                          setDraggedImageIndex(null)
                        }}
                        onDragEnd={() => setDraggedImageIndex(null)}
                        style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fafaf8', borderRadius: '10px', padding: '8px', opacity: draggedImageIndex === i ? 0.4 : 1, cursor: 'grab' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#ccc" style={{ flexShrink: 0 }}>
                          <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                          <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                        </svg>
                        <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', background: '#eee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {img.uploading ? <span style={{ fontSize: '10px', color: '#aaa' }}>上传中</span> : <PrivateTheaterImage src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
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
              <button onClick={() => { setShowAdd(false); setCharDropdownOpen(false); setCardDropdownOpen(false); setDraftImages([]) }}
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
