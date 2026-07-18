'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Portfolio() {
  const [items, setItems] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('portfolio').select('*').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !title) return alert('请先填写标题')
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
    const fileType = file.type.startsWith('image') ? 'image' : 'audio'
    const { data, error } = await supabase.storage.from('portfolio').upload(fileName, file)
    if (error) { alert('上传失败'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(fileName)
    await supabase.from('portfolio').insert({ title, description, file_url: urlData.publicUrl, file_type: fileType })
    setTitle(''); setDescription('')
    setUploading(false)
    fetchItems()
  }

  async function deleteItem(id: number, file_url: string) {
    const fileName = file_url.split('/').pop()
    await supabase.storage.from('portfolio').remove([fileName!])
    await supabase.from('portfolio').delete().eq('id', id)
    fetchItems()
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-12 py-6 border-b border-gray-100">
        <a href="/" className="text-xl font-light tracking-widest text-gray-800">Yuria</a>
        <span className="text-sm text-blue-400 tracking-widest uppercase">Portfolio</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 上传区 */}
        <div className="border border-gray-100 p-6 mb-10 bg-blue-50">
          <input
            className="w-full bg-transparent border-b border-gray-200 pb-2 mb-4 text-sm focus:outline-none"
            placeholder="作品标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            className="w-full bg-transparent border-b border-gray-200 pb-2 mb-4 text-sm focus:outline-none"
            placeholder="作品描述（选填）"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <label className="cursor-pointer text-xs text-blue-400 border border-blue-200 px-4 py-2 hover:bg-blue-100 transition-colors">
              {uploading ? '上传中...' : '选择图片或音乐'}
              <input type="file" className="hidden" accept="image/*,audio/*" onChange={uploadFile} disabled={uploading} />
            </label>
            <span className="text-xs text-gray-300">支持 JPG、PNG、MP3、WAV</span>
          </div>
        </div>

        {/* 作品列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map(item => (
            <div key={item.id} className="border border-gray-100 hover:border-blue-200 transition-colors">
              {item.file_type === 'image' ? (
                <img src={item.file_url} alt={item.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="bg-blue-50 p-8 flex items-center justify-center">
                  <audio controls src={item.file_url} className="w-full" />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-light text-gray-800 mb-1">{item.title}</h3>
                    {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                  </div>
                  <button onClick={() => deleteItem(item.id, item.file_url)} className="text-xs text-gray-300 hover:text-red-400">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
