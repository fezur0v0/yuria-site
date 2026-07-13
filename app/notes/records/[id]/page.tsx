'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

type ImageItem = { url: string; caption?: string }

type Character = {
  id: string
  name: string
  avatar: string | null
}

type RecordDetail = {
  id: string
  title: string
  extra_tag: string | null
  content: string | null
  images: ImageItem[] | null
  character_id: string | null
  characters: Character | null
  created_at: string
}

// 极简 markdown 渲染：**加粗** 和 > 引用，按空行分段
function renderMarkdown(text: string) {
  const blocks = text.split(/\n\s*\n/)
  return blocks.map((block, i) => {
    const isQuote = block.trim().startsWith('>')
    const cleaned = block.replace(/^>\s?/gm, '')
    const parts = cleaned.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} style={{ fontWeight: 600, color: '#1a1a1a' }}>{part.slice(2, -2)}</strong>
      }
      return <span key={j}>{part}</span>
    })
    if (isQuote) {
      return (
        <blockquote key={i} style={{
          margin: '16px 0', padding: '4px 0 4px 16px', borderLeft: '3px solid #e0e0de',
          color: '#888', fontSize: '13px', fontStyle: 'italic', whiteSpace: 'pre-wrap',
        }}>{parts}</blockquote>
      )
    }
    return (
      <p key={i} style={{ margin: '0 0 16px', color: '#444', fontSize: '14px', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{parts}</p>
    )
  })
}

export default function RecordDetail() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [record, setRecord] = useState<RecordDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem('notes_auth') !== 'true') {
      router.replace('/notes'); return
    }
    fetchRecord()
  }, [id])

  async function fetchRecord() {
    setLoading(true)
    const { data } = await supabase
      .from('theater_records')
      .select('*, characters(id,name,avatar)')
      .eq('id', id)
      .single()
    setRecord((data as any) || null)
    setLoading(false)
  }

  const images = record?.images || []

  function openLightbox(i: number) { setLightboxIndex(i) }
  function closeLightbox() { setLightboxIndex(null) }
  function prevImage() { setLightboxIndex(i => (i === null ? null : (i - 1 + images.length) % images.length)) }
  function nextImage() { setLightboxIndex(i => (i === null ? null : (i + 1) % images.length)) }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '13px', background: '#fafaf8' }}>加载中...</div>
  }

  if (!record) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '13px', background: '#fafaf8' }}>未找到该记录</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf8', fontFamily: 'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&family=Inter:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .thumb { transition: transform 0.2s; }
        .thumb:hover { transform: scale(1.02); }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <button onClick={() => router.push('/notes/records')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '13px', padding: 0, marginBottom: '28px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回记录列表
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          {record.characters?.avatar
            ? <img src={record.characters.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e8e8e6' }} />}
          <span style={{ fontSize: '14px', color: '#666' }}>{record.characters?.name || '未命名'}</span>
        </div>

        <h1 style={{ fontFamily: 'Noto Serif SC,serif', fontSize: '26px', fontWeight: 400, color: '#1a1a1a', margin: '0 0 6px', lineHeight: 1.4 }}>{record.title}</h1>
        {record.extra_tag && <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '24px' }}>{record.extra_tag}</div>}

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f0f0ee', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {record.content && renderMarkdown(record.content)}

          {images.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0ee' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {images.map((img, i) => (
                  <div key={i} className="thumb" onClick={() => openLightbox(i)}
                    style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', background: '#f0f0ee' }}>
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: '12px', color: '#bbb', marginTop: '20px', textAlign: 'center' }}>
          {new Date(record.created_at).toLocaleDateString('zh-CN')}
        </div>
      </div>

      {lightboxIndex !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={closeLightbox}>

          <button onClick={closeLightbox}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>

          <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '13px' }}>
            {lightboxIndex + 1} / {images.length}
          </div>

          {images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); prevImage() }}
              style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}

          <img src={images[lightboxIndex].url} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />

          {images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); nextImage() }}
              style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}

          {images[lightboxIndex].caption && (
            <div onClick={e => e.stopPropagation()} style={{ marginTop: '16px', color: '#ddd', fontSize: '13px', textAlign: 'center', maxWidth: '480px' }}>
              {images[lightboxIndex].caption}
            </div>
          )}

          {images.length > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '6px', marginTop: '20px', maxWidth: '90vw', overflowX: 'auto', padding: '4px' }}>
              {images.map((img, i) => (
                <img key={i} src={img.url} alt="" onClick={() => setLightboxIndex(i)}
                  style={{
                    width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer',
                    opacity: i === lightboxIndex ? 1 : 0.4,
                    border: i === lightboxIndex ? '2px solid #fff' : '2px solid transparent',
                    flexShrink: 0,
                  }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
