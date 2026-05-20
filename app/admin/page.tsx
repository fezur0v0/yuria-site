'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export default function Admin() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // 配置
  const [coverUrl, setCoverUrl] = useState('')
  const [signature, setSignature] = useState('')

  // 音乐
  const [tracks, setTracks] = useState<any[]>([])
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', src: '', cover_url: '' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return }
      setLoading(false)
      fetchConfig()
      fetchTracks()
    })
  }, [])

  async function fetchConfig() {
    const { data } = await supabase.from('site_config').select('*')
    if (data) {
      data.forEach((r: any) => {
        if (r.key === 'cover_url') setCoverUrl(r.value || '')
        if (r.key === 'signature') setSignature(r.value || '')
      })
    }
  }

  async function fetchTracks() {
    const { data } = await supabase.from('music_tracks').select('*').order('sort_order')
    setTracks(data || [])
  }

  async function saveConfig() {
    setSaving(true)
    await supabase.from('site_config').upsert({ key: 'cover_url', value: coverUrl })
    await supabase.from('site_config').upsert({ key: 'signature', value: signature })
    setMsg('已保存 ✓')
    setSaving(false)
    setTimeout(() => setMsg(''), 2000)
  }

  async function addTrack() {
    if (!newTrack.title || !newTrack.src) return setMsg('请填写歌曲名和链接')
    await supabase.from('music_tracks').insert({
      ...newTrack,
      sort_order: tracks.length + 1
    })
    setNewTrack({ title: '', artist: '', src: '', cover_url: '' })
    fetchTracks()
    setMsg('已添加 ✓')
    setTimeout(() => setMsg(''), 2000)
  }

  async function deleteTrack(id: number) {
    await supabase.from('music_tracks').delete().eq('id', id)
    fetchTracks()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">加载中...</div>

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 style={{fontFamily:'Noto Serif SC,serif',fontSize:'24px',fontWeight:300,letterSpacing:'.1em'}}>管理面板</h1>
        <button onClick={() => router.push('/')} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">← 返回首页</button>
      </div>

      {msg && <div className="mb-6 text-xs text-green-600 bg-green-50 px-4 py-2 rounded-lg">{msg}</div>}

      {/* 基本设置 */}
      <section className="mb-10">
        <h2 className="text-xs tracking-widest text-gray-400 mb-4">基本设置</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">封面图 URL</label>
            <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors"
              placeholder="https://..." />
            {coverUrl && <img src={coverUrl} className="mt-2 h-20 rounded-lg object-cover" alt="预览" onError={e => (e.currentTarget.style.display='none')} />}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">个性签名</label>
            <input value={signature} onChange={e => setSignature(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors"
              placeholder="我的小小世界" />
          </div>
          <button onClick={saveConfig} disabled={saving}
            className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </section>

      {/* 音乐管理 */}
      <section>
        <h2 className="text-xs tracking-widest text-gray-400 mb-4">音乐列表</h2>

        {/* 现有曲目 */}
        <div className="space-y-2 mb-6">
          {tracks.length === 0 && <p className="text-xs text-gray-300 text-center py-4">暂无曲目</p>}
          {tracks.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{t.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.artist}</div>
              </div>
              <button onClick={() => deleteTrack(t.id)} className="text-xs text-red-300 hover:text-red-500 transition-colors flex-shrink-0">删除</button>
            </div>
          ))}
        </div>

        {/* 添加新曲目 */}
        <div className="border border-gray-100 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-gray-400 tracking-wide">添加新曲目</p>
          <input value={newTrack.title} onChange={e => setNewTrack(p => ({...p, title: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
            placeholder="歌曲名 *" />
          <input value={newTrack.artist} onChange={e => setNewTrack(p => ({...p, artist: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
            placeholder="歌手/作者" />
          <input value={newTrack.src} onChange={e => setNewTrack(p => ({...p, src: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
            placeholder="音乐直链 URL * (mp3/flac)" />
          <input value={newTrack.cover_url} onChange={e => setNewTrack(p => ({...p, cover_url: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
            placeholder="封面图 URL (可选)" />
          <button onClick={addTrack}
            className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm tracking-wide hover:opacity-90 transition-opacity">
            添加曲目
          </button>
        </div>
      </section>
    </main>
  )
}
