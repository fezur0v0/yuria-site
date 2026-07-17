'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TableBuilderModal from '@/components/TableBuilderModal'

const supabase = createClient()

type ImageItem = { url: string; caption?: string }
type DraftImage = ImageItem & { uploading?: boolean }

type Character = { id: string; name: string; avatar: string | null }
type CardOption = { id: string; title: string }

type RecordDetail = {
  id: string
  title: string
  extra_tag: string | null
  content: string | null
  images: ImageItem[] | null
  card_id: string | null
  character_id: string | null
  characters: Character | null
  created_at: string
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral max-w-none prose-p:text-[14px] prose-p:leading-[1.9] prose-p:text-[#444] prose-strong:text-[#1a1a1a] prose-strong:font-semibold prose-headings:font-normal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          blockquote: ({ children }) => (
            <blockquote style={{
              position: 'relative', margin: '20px 0', padding: '14px 20px 14px 44px',
              background: '#f7f7f5', borderRadius: '10px', color: '#666', fontSize: '14px', lineHeight: 1.8,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#d4d4d0" style={{ position: 'absolute', left: '14px', top: '14px' }}>
                <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-4v-10h10z"/>
              </svg>
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function RecordDetail() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [record, setRecord] = useState<RecordDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // 编辑相关
  const [showEdit, setShowEdit] = useState(false)
  const [characters, setCharacters] = useState<Character[]>([])
  const [cardOptions, setCardOptions] = useState<CardOption[]>([])
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ character_id: '', card_id: '', title: '', extra_tag: '', content: '' })
  const [draftImages, setDraftImages] = useState<DraftImage[]>([])
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const [charDropdownOpen, setCharDropdownOpen] = useState(false)
  const [showNewCharForm, setShowNewCharForm] = useState(false)
  const [newCharName, setNewCharName] = useState('')
  const [newCharAvatar, setNewCharAvatar] = useState('')
  const [newCharUploading, setNewCharUploading] = useState(false)
  const [savingNewChar, setSavingNewChar] = useState(false)

  const [cardDropdownOpen, setCardDropdownOpen] = useState(false)
  const [cardSearch, setCardSearch] = useState('')

  const [showTableBuilder, setShowTableBuilder] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('notes_auth') !== 'true') { router.replace('/notes'); return }
    fetchRecord()
    fetchCharacters()
    fetchCardOptions()
  }, [id])

  async function fetchRecord() {
    setLoading(true)
    const { data } = await supabase.from('theater_records').select('*, characters(id,name,avatar)').eq('id', id).single()
    setRecord((data as any) || null)
    setLoading(false)
  }
  async function fetchCharacters() {
    const { data } = await supabase.from('characters').select('*').order('created_at', { ascending: true })
    setCharacters(data || [])
  }
  async function fetchCardOptions() {
    const { data } = await supabase.from('theater_cards').select('id,title').order('created_at', { ascending: false })
    setCardOptions(data || [])
  }

  function openEdit() {
    if (!record) return
    setEditForm({
      character_id: record.character_id || '',
      card_id: record.card_id || '',
      title: record.title,
      extra_tag: record.extra_tag || '',
      content: record.content || '',
    })
    setDraftImages((record.images || []).map(img => ({ ...img })))
    setCardSearch('')
    setShowEdit(true)
  }

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
      setEditForm(p => ({ ...p, character_id: data.id }))
    }
    setNewCharName(''); setNewCharAvatar(''); setShowNewCharForm(false); setCharDropdownOpen(false)
    setSavingNewChar(false)
  }

  function insertMarkdown(type: 'bold' | 'quote' | 'strike' | 'ul' | 'ol') {
    const ta = contentRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = editForm.content
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
    setEditForm(p => ({ ...p, content: nextValue }))
    requestAnimationFrame(() => {
      ta.focus()
      const pos = selected ? start + insertText.length : (type === 'bold' ? start + 2 : start + 2)
      ta.selectionStart = ta.selectionEnd = pos
    })
  }

  function insertRawText(text: string) {
    setEditForm(p => ({ ...p, content: p.content ? `${p.content}\n\n${text}\n` : `${text}\n` }))
  }

  async function saveEdit() {
    if (!editForm.title || !editForm.character_id || !record) return
    setSaving(true)
    const images = draftImages.filter(img => !img.uploading && img.url).map(img => ({ url: img.url, caption: img.caption || '' }))
    await supabase.from('theater_records').update({
      character_id: editForm.character_id,
      card_id: editForm.card_id || null,
      title: editForm.title,
      extra_tag: editForm.extra_tag || null,
      content: editForm.content || null,
      images,
      updated_at: new Date().toISOString(),
    }).eq('id', record.id)
    setSaving(false)
    setShowEdit(false)
    fetchRecord()
  }

  async function deleteRecord() {
    if (!record || !confirm('确定删除这条记录？')) return
    await supabase.from('theater_records').delete().eq('id', record.id)
    router.push('/notes/records')
  }

  const images = record?.images || []
  function openLightbox(i: number) { setLightboxIndex(i) }
  function closeLightbox() { setLightboxIndex(null) }
  function prevImage() { setLightboxIndex(i => (i === null ? null : (i - 1 + images.length) % images.length)) }
  function nextImage() { setLightboxIndex(i => (i === null ? null : (i + 1) % images.length)) }

  const selectedChar = characters.find(c => c.id === editForm.character_id)
  const selectedCard = cardOptions.find(c => c.id === editForm.card_id)
  const filteredCardOptions = cardOptions.filter(c => c.title.toLowerCase().includes(cardSearch.toLowerCase()))

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '13px', background: '#fafaf8' }}>加载中...</div>
  if (!record) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '13px', background: '#fafaf8' }}>未找到该记录</div>

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .thumb { transition: transform 0.2s; }
        .thumb:hover { transform: scale(1.02); }
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { scrollbar-width: none; -ms-overflow-style: none; }
        .md-btn { background:#f5f5f3;border:1px solid #ebebeb;border-radius:6px;padding:4px 10px;font-size:12px;color:#666;cursor:pointer; }
        .md-btn:hover { background:#eaeae8; }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button onClick={() => router.push('/notes/records')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '13px', padding: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            返回记录列表
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={openEdit}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f5f5f3', border: '1px solid #ebebeb', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#666', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              编辑
            </button>
            <button onClick={deleteRecord}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px solid #fca5a5', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}>
              删除
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          {record.characters?.avatar ? <img src={record.characters.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e8e8e6' }} />}
          <span style={{ fontSize: '14px', color: '#666' }}>{record.characters?.name || '未命名'}</span>
        </div>

        <h1 style={{ fontFamily: 'Noto Serif SC,serif', fontSize: '26px', fontWeight: 400, color: '#1a1a1a', margin: '0 0 6px', lineHeight: 1.4 }}>{record.title}</h1>
        {record.extra_tag && <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '24px' }}>{record.extra_tag}</div>}

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0ee', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {record.content && <MarkdownContent content={record.content} />}
          {images.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0ee' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {images.map((img, i) => (
                  <div key={i} className="thumb" onClick={() => openLightbox(i)} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', background: '#f0f0ee' }}>
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: '12px', color: '#bbb', marginTop: '20px', textAlign: 'center' }}>{new Date(record.created_at).toLocaleDateString('zh-CN')}</div>
      </div>

      {/* 灯箱 */}
      {lightboxIndex !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={closeLightbox}>
          <button onClick={closeLightbox} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '13px' }}>{lightboxIndex + 1} / {images.length}</div>
          {images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); prevImage() }} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          <img src={images[lightboxIndex].url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
          {images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); nextImage() }} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
          {images[lightboxIndex].caption && (
            <div onClick={e => e.stopPropagation()} style={{ marginTop: '16px', color: '#ddd', fontSize: '13px', textAlign: 'center', maxWidth: '480px' }}>{images[lightboxIndex].caption}</div>
          )}
          {images.length > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '6px', marginTop: '20px', maxWidth: '90vw', overflowX: 'auto', padding: '4px' }}>
              {images.map((img, i) => (
                <img key={i} src={img.url} alt="" onClick={() => setLightboxIndex(i)}
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', opacity: i === lightboxIndex ? 1 : 0.4, border: i === lightboxIndex ? '2px solid #fff' : '2px solid transparent', flexShrink: 0 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => { setShowEdit(false); setCharDropdownOpen(false); setCardDropdownOpen(false) }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: 'min(560px,100%)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Noto Serif SC,serif', fontWeight: 300, fontSize: '18px', color: '#1a1a1a', margin: '0 0 20px' }}>编辑记录</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>角色 *</label>
                <div onClick={() => { setCharDropdownOpen(v => !v); setCardDropdownOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #ebebeb', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', cursor: 'pointer', color: selectedChar ? '#1a1a1a' : '#bbb' }}>
                  {selectedChar ? (<>{selectedChar.avatar ? <img src={selectedChar.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e8e8e6' }} />}{selectedChar.name}</>) : '点击选择角色'}
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {charDropdownOpen && (
                  <div className="scroll-hide" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: '#fff', border: '1px solid #ebebeb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: '240px', overflowY: 'auto', zIndex: 10 }}>
                    {!showNewCharForm ? (
                      <>
                        <div onClick={() => setShowNewCharForm(true)} style={{ padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', fontWeight: 500, cursor: 'pointer', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                          新角色
                        </div>
                        {characters.map(c => (
                          <div key={c.id} onClick={() => { setEditForm(p => ({ ...p, character_id: c.id })); setCharDropdownOpen(false) }}
                            style={{ padding: '9px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: editForm.character_id === c.id ? '#1a1a1a' : '#555', background: editForm.character_id === c.id ? '#f5f5f3' : '#fff' }}>
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
                          {newCharAvatar ? <img src={newCharAvatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>}
                          {newCharUploading ? '上传中...' : '上传头像（可选）'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleNewCharAvatar(e.target.files)} />
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { setShowNewCharForm(false); setNewCharName(''); setNewCharAvatar('') }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ebebeb', background: '#fff', color: '#666', fontSize: '12px', cursor: 'pointer' }}>取消</button>
                          <button onClick={saveNewCharacter} disabled={!newCharName.trim() || savingNewChar} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: !newCharName.trim() || savingNewChar ? '#f0f0ee' : '#1a1a1a', color: !newCharName.trim() || savingNewChar ? '#aaa' : '#fff', fontSize: '12px', cursor: 'pointer' }}>{savingNewChar ? '保存中' : '保存角色'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                      {editForm.card_id && (
                        <div onClick={() => { setEditForm(p => ({ ...p, card_id: '' })); setCardDropdownOpen(false) }} style={{ padding: '8px 10px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}>取消关联</div>
                      )}
                      {filteredCardOptions.length === 0 ? (
                        <div style={{ padding: '10px', fontSize: '12px', color: '#ccc', textAlign: 'center' }}>没有找到词库</div>
                      ) : filteredCardOptions.map(c => (
                        <div key={c.id} onClick={() => { setEditForm(p => ({ ...p, card_id: c.id })); setCardDropdownOpen(false) }}
                          style={{ padding: '8px 10px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', color: editForm.card_id === c.id ? '#1a1a1a' : '#666', background: editForm.card_id === c.id ? '#f5f5f3' : '#fff' }}>
                          {c.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>标题 *</label>
                <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="标题"
                  style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', display: 'block' }}>副标题</label>
                <input value={editForm.extra_tag} onChange={e => setEditForm(p => ({ ...p, extra_tag: e.target.value }))} placeholder="副标题"
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
                <textarea ref={contentRef} value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} rows={7}
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
                          <button onClick={() => moveImage(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'not-allowed' : 'pointer', color: i === 0 ? '#e0e0e0' : '#999', padding: '2px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
                          </button>
                          <button onClick={() => moveImage(i, 1)} disabled={i === draftImages.length - 1} style={{ background: 'none', border: 'none', cursor: i === draftImages.length - 1 ? 'not-allowed' : 'pointer', color: i === draftImages.length - 1 ? '#e0e0e0' : '#999', padding: '2px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                          </button>
                        </div>
                        <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', background: '#eee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {img.uploading ? <span style={{ fontSize: '10px', color: '#aaa' }}>上传中</span> : <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <input value={img.caption || ''} onChange={e => updateCaption(i, e.target.value)} placeholder="这张图的备注（可选）"
                          style={{ flex: 1, border: '1px solid #ebebeb', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', outline: 'none' }} />
                        <button onClick={() => removeDraftImage(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '4px', flexShrink: 0 }}
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
              <button onClick={() => setShowEdit(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #ebebeb', background: '#fff', color: '#666', fontSize: '13px', cursor: 'pointer' }}>取消</button>
              <button onClick={saveEdit} disabled={saving || !editForm.title || !editForm.character_id}
                style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: saving || !editForm.title || !editForm.character_id ? '#f0f0ee' : '#1a1a1a', color: saving || !editForm.title || !editForm.character_id ? '#aaa' : '#fff', fontSize: '13px', cursor: saving || !editForm.title || !editForm.character_id ? 'not-allowed' : 'pointer' }}>
                {saving ? '保存中...' : '保存修改'}
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
