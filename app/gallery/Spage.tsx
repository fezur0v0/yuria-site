'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Gallery() {
  const [images, setImages] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'text'>('pen')
  const [color, setColor] = useState('#2563EB')
  const [note, setNote] = useState('')

  useEffect(() => { fetchImages() }, [])

  async function fetchImages() {
    const { data } = await supabase.from('gallery').select('*').order('created_at', { ascending: false })
    setImages(data || [])
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !title) return alert('请先填写标题')
    setUploading(true)
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`
    await supabase.storage.from('gallery').upload(fileName, file)
    const { data } = supabase.storage.from('gallery').getPublicUrl(fileName)
    await supabase.from('gallery').insert({ title, image_url: data.publicUrl, annotations: '[]' })
    setTitle('')
    setUploading(false)
    fetchImages()
  }

  async function downloadImage(url: string, name: string) {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
  }

  function openAnnotation(img: any) {
    setSelected(img)
    setNote('')
  }

  function startDraw(e: React.MouseEvent) {
    if (tool !== 'pen') return
    setDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }

  function draw(e: React.MouseEvent) {
    if (!drawing || tool !== 'pen') return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  function stopDraw() { setDrawing(false) }

  function addText(e: React.MouseEvent) {
    if (tool !== 'text' || !note) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.font = '14px sans-serif'
    ctx.fillStyle = color
    ctx.fillText(note, e.clientX - rect.left, e.clientY - rect.top)
  }

  function clearCanvas() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function deleteImage(id: number, image_url: string) {
    const fileName = image_url.split('/').pop()!
    await supabase.storage.from('gallery').remove([fileName])
    await supabase.from('gallery').delete().eq('id', id)
    fetchImages()
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-12 py-6 border-b border-gray-100">
        <a href="/" className="text-xl font-light tracking-widest text-gray-800">Yuria</a>
        <span className="text-sm text-blue-400 tracking-widest uppercase">Gallery</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* 上传区 */}
        <div className="border border-gray-100 p-6 mb-10 bg-blue-50 flex gap-4 items-center">
          <input
            className="flex-1 bg-transparent border-b border-gray-200 pb-1 text-sm focus:outline-none"
            placeholder="图片标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <label className="cursor-pointer text-xs text-blue-400 border border-blue-200 px-4 py-2 hover:bg-blue-100 transition-colors">
            {uploading ? '上传中...' : '上传图片'}
            <input type="file" className="hidden" accept="image/*" onChange={uploadImage} disabled={uploading} />
          </label>
        </div>

        {/* 图集网格 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map(img => (
            <div key={img.id} className="group relative border border-gray-100 hover:border-blue-200 transition-colors overflow-hidden">
              <img src={img.image_url} alt={img.title} className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                <button onClick={() => openAnnotation(img)} className="bg-white text-xs px-3 py-1.5 text-gray-700 hover:bg-blue-50">标注</button>
                <button onClick={() => downloadImage(img.image_url, img.title)} className="bg-white text-xs px-3 py-1.5 text-gray-700 hover:bg-blue-50">下载</button>
                <button onClick={() => deleteImage(img.id, img.image_url)} className="bg-white text-xs px-3 py-1.5 text-red-400 hover:bg-red-50">删除</button>
              </div>
              <div className="p-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">{img.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 标注弹窗 */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-screen overflow-auto">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">{selected.title}</span>
              <div className="flex gap-2 items-center">
                <button onClick={() => setTool('pen')} className={`text-xs px-3 py-1 border ${tool === 'pen' ? 'border-blue-400 text-blue-400' : 'border-gray-200 text-gray-400'}`}>画笔</button>
                <button onClick={() => setTool('text')} className={`text-xs px-3 py-1 border ${tool === 'text' ? 'border-blue-400 text-blue-400' : 'border-gray-200 text-gray-400'}`}>文字</button>
                {tool === 'text' && <input className="text-xs border border-gray-200 px-2 py-1 w-24 focus:outline-none" placeholder="输入文字" value={note} onChange={e => setNote(e.target.value)} />}
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 cursor-pointer border-0" />
                <button onClick={clearCanvas} className="text-xs px-3 py-1 border border-gray-200 text-gray-400 hover:text-red-400">清除</button>
                <button onClick={() => setSelected(null)} className="text-xs px-3 py-1 border border-gray-200 text-gray-400">关闭</button>
              </div>
            </div>
            <div className="relative">
              <img src={selected.image_url} alt={selected.title} className="w-full" />
              <canvas
                ref={canvasRef}
                width={800} height={600}
                className="absolute inset-0 w-full h-full"
                style={{ cursor: tool === 'pen' ? 'crosshair' : 'text' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onClick={addText}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
