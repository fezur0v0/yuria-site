'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Notes() {
  const [notes, setNotes] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any>(null)

  useEffect(() => { fetchNotes() }, [])

  async function fetchNotes() {
    const { data } = await supabase.from('notes').select('*').order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function saveNote() {
    if (!title && !content) return
    if (editing) {
      await supabase.from('notes').update({ title, content, tags }).eq('id', editing.id)
      setEditing(null)
    } else {
      await supabase.from('notes').insert({ title, content, tags })
    }
    setTitle(''); setContent(''); setTags('')
    fetchNotes()
  }

  async function deleteNote(id: number) {
    await supabase.from('notes').delete().eq('id', id)
    fetchNotes()
  }

  function editNote(note: any) {
    setEditing(note)
    setTitle(note.title || '')
    setContent(note.content || '')
    setTags(note.tags || '')
  }

  const filtered = notes.filter(n =>
    (n.title || '').includes(search) ||
    (n.content || '').includes(search) ||
    (n.tags || '').includes(search)
  )

  return (
    <main className="min-h-screen bg-white">
      <nav className="flex justify-between items-center px-12 py-6 border-b border-gray-100">
        <a href="/" className="text-xl font-light tracking-widest text-gray-800">Yuria</a>
        <span className="text-sm text-blue-400 tracking-widest uppercase">Notes</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 搜索栏 */}
        <input
          className="w-full border border-gray-200 px-4 py-3 text-sm mb-8 focus:outline-none focus:border-blue-300"
          placeholder="搜索标题、内容或标签..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* 发帖区 */}
        <div className="border border-gray-100 p-6 mb-10 bg-blue-50">
          <input
            className="w-full bg-transparent border-b border-gray-200 pb-2 mb-4 text-sm focus:outline-none focus:border-blue-300"
            placeholder="标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-transparent text-sm focus:outline-none resize-none mb-4"
            rows={4}
            placeholder="写点什么..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <input
              className="bg-transparent border-b border-gray-200 text-xs focus:outline-none w-48"
              placeholder="标签（用逗号分隔）"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
            <button
              onClick={saveNote}
              className="bg-blue-500 text-white text-xs px-6 py-2 hover:bg-blue-600 transition-colors"
            >
              {editing ? '更新' : '发布'}
            </button>
          </div>
        </div>

        {/* 帖子列表 */}
        <div className="flex flex-col gap-4">
          {filtered.map(note => (
            <div key={note.id} className="border border-gray-100 p-6 hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-light text-gray-800">{note.title}</h3>
                <div className="flex gap-3 text-xs text-gray-300">
                  <button onClick={() => editNote(note)} className="hover:text-blue-400">编辑</button>
                  <button onClick={() => navigator.clipboard.writeText(note.content || '')} className="hover:text-blue-400">复制</button>
                  <button onClick={() => deleteNote(note.id)} className="hover:text-red-400">删除</button>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{note.content}</p>
              {note.tags && (
                <div className="flex gap-2 flex-wrap">
                  {note.tags.split(',').map((tag: string) => (
                    <span key={tag} className="text-xs text-blue-400 border border-blue-100 px-2 py-0.5">{tag.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}