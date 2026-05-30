'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const ALLOWED_GITHUB_ID = '261478435'

type PortfolioItem = {
  id: string
  title: string
  category: string
  year: string
  description: string
  cover_url: string
  sort_order: number
  is_visible: boolean
}

type GalleryItem = {
  id: string
  title: string
  cover_url: string
  sort_order: number
  is_visible: boolean
}

export default function Admin() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState<'basic' | 'music' | 'portfolio' | 'gallery'>('basic')

  // 基本设置
  const [coverUrl, setCoverUrl] = useState('')
  const [signature, setSignature] = useState('')

  // 音乐
  const [tracks, setTracks] = useState<any[]>([])
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', src: '', cover_url: '' })

  // 作品集 / 图集
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])

  // 新增表单
  const [newPortfolio, setNewPortfolio] = useState({ title: '', category: '', year: '2025', description: '', cover_url: '' })
  const [newGallery, setNewGallery] = useState({ title: '', cover_url: '' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/admin/login'); return }
      const githubId = String(
        data.user.user_metadata?.provider_id ||
        data.user.user_metadata?.sub ||
        ''
      )
        console.log('GitHub ID:', githubId) 
  console.log('user_metadata:', data.user.user_metadata) 
      if (githubId !== ALLOWED_GITHUB_ID) { router.push('/admin/unauthorized'); return }
      setLoading(false)
      fetchConfig()
      fetchTracks()
      fetchPortfolio()
      fetchGallery()
    })
  }, [])

  // ---- 基本设置 ----
  async function fetchConfig() {
    const { data } = await supabase.from('site_config').select('*')
    if (data) {
      data.forEach((r: any) => {
        if (r.key === 'cover_url') setCoverUrl(r.value || '')
        if (r.key === 'signature') setSignature(r.value || '')
      })
    }
  }

  async function saveConfig() {
    setSaving(true)
    await supabase.from('site_config').upsert({ key: 'cover_url', value: coverUrl })
    await supabase.from('site_config').upsert({ key: 'signature', value: signature })
    showMsg('已保存 ✓')
    setSaving(false)
  }

  // ---- 音乐 ----
  async function fetchTracks() {
    const { data } = await supabase.from('music_tracks').select('*').order('sort_order')
    setTracks(data || [])
  }

  async function addTrack() {
    if (!newTrack.title || !newTrack.src) return showMsg('请填写歌曲名和链接')
    await supabase.from('music_tracks').insert({ ...newTrack, sort_order: tracks.length + 1 })
    setNewTrack({ title: '', artist: '', src: '', cover_url: '' })
    fetchTracks()
    showMsg('已添加 ✓')
  }

  async function deleteTrack(id: number) {
    await supabase.from('music_tracks').delete().eq('id', id)
    fetchTracks()
  }

  // ---- 作品集 ----
  async function fetchPortfolio() {
    const { data } = await supabase.from('homepage_portfolio').select('*').order('sort_order')
    setPortfolioItems(data || [])
  }

  async function addPortfolio() {
    if (!newPortfolio.title) return showMsg('请填写标题')
    await supabase.from('homepage_portfolio').insert({
      ...newPortfolio,
      sort_order: portfolioItems.length,
      is_visible: true,
    })
    setNewPortfolio({ title: '', category: '', year: '2025', description: '', cover_url: '' })
    fetchPortfolio()
    showMsg('已添加 ✓')
  }

  async function updatePortfolioField(id: string, field: string, value: string | boolean) {
    await supabase.from('homepage_portfolio').update({ [field]: value }).eq('id', id)
    fetchPortfolio()
  }

  async function movePortfolio(index: number, dir: -1 | 1) {
    const items = [...portfolioItems]
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const a = items[index], b = items[target]
    await supabase.from('homepage_portfolio').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('homepage_portfolio').update({ sort_order: a.sort_order }).eq('id', b.id)
    fetchPortfolio()
  }

  async function deletePortfolio(id: string) {
    await supabase.from('homepage_portfolio').delete().eq('id', id)
    fetchPortfolio()
  }

  // ---- 图集 ----
  async function fetchGallery() {
    const { data } = await supabase.from('homepage_gallery').select('*').order('sort_order')
    setGalleryItems(data || [])
  }

  async function addGallery() {
    if (!newGallery.title) return showMsg('请填写标题')
    await supabase.from('homepage_gallery').insert({
      ...newGallery,
      sort_order: galleryItems.length,
      is_visible: true,
    })
    setNewGallery({ title: '', cover_url: '' })
    fetchGallery()
    showMsg('已添加 ✓')
  }

  async function updateGalleryField(id: string, field: string, value: string | boolean) {
    await supabase.from('homepage_gallery').update({ [field]: value }).eq('id', id)
    fetchGallery()
  }

  async function moveGallery(index: number, dir: -1 | 1) {
    const items = [...galleryItems]
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const a = items[index], b = items[target]
    await supabase.from('homepage_gallery').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('homepage_gallery').update({ sort_order: a.sort_order }).eq('id', b.id)
    fetchGallery()
  }

  async function deleteGallery(id: string) {
    await supabase.from('homepage_gallery').delete().eq('id', id)
    fetchGallery()
  }

  function showMsg(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
      加载中...
    </div>
  )

  const tabClass = (t: string) =>
    `px-4 py-2 text-xs tracking-widest transition-colors rounded-lg ${
      tab === t ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'
    }`

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontFamily: 'Noto Serif SC,serif', fontSize: '24px', fontWeight: 300, letterSpacing: '.1em' }}>
          管理面板
        </h1>
        <button onClick={() => router.push('/')} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← 返回首页
        </button>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button className={tabClass('basic')} onClick={() => setTab('basic')}>基本设置</button>
        <button className={tabClass('music')} onClick={() => setTab('music')}>音乐</button>
        <button className={tabClass('portfolio')} onClick={() => setTab('portfolio')}>作品集</button>
        <button className={tabClass('gallery')} onClick={() => setTab('gallery')}>图集</button>
      </div>

      {msg && (
        <div className="mb-6 text-xs text-green-600 bg-green-50 px-4 py-2 rounded-lg">{msg}</div>
      )}

      {/* ===== 基本设置 ===== */}
      {tab === 'basic' && (
        <section className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">封面图 URL</label>
            <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="https://..." />
            {coverUrl && (
              <img src={coverUrl} className="mt-2 h-20 rounded-lg object-cover" alt="预览"
                onError={e => (e.currentTarget.style.display = 'none')} />
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">个性签名</label>
            <input value={signature} onChange={e => setSignature(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
              placeholder="我的小小世界" />
          </div>
          <button onClick={saveConfig} disabled={saving}
            className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
            {saving ? '保存中...' : '保存设置'}
          </button>
        </section>
      )}

      {/* ===== 音乐 ===== */}
      {tab === 'music' && (
        <section>
          <div className="space-y-2 mb-6">
            {tracks.length === 0 && <p className="text-xs text-gray-300 text-center py-4">暂无曲目</p>}
            {tracks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{t.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.artist}</div>
                </div>
                <button onClick={() => deleteTrack(t.id)} className="text-xs text-red-300 hover:text-red-500">删除</button>
              </div>
            ))}
          </div>
          <div className="border border-gray-100 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-gray-400 tracking-wide">添加新曲目</p>
            {[
              { key: 'title', placeholder: '歌曲名 *' },
              { key: 'artist', placeholder: '歌手/作者' },
              { key: 'src', placeholder: '音乐直链 URL * (mp3/flac)' },
              { key: 'cover_url', placeholder: '封面图 URL（可选）' },
            ].map(({ key, placeholder }) => (
              <input key={key} value={(newTrack as any)[key]}
                onChange={e => setNewTrack(p => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                placeholder={placeholder} />
            ))}
            <button onClick={addTrack}
              className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm hover:opacity-90">
              添加曲目
            </button>
          </div>
        </section>
      )}

      {/* ===== 作品集 ===== */}
      {tab === 'portfolio' && (
        <section>
          {/* 现有列表 */}
          <div className="space-y-3 mb-6">
            {portfolioItems.length === 0 && <p className="text-xs text-gray-300 text-center py-4">暂无内容，在下方添加</p>}
            {portfolioItems.map((item, i) => (
              <div key={item.id} className={`border rounded-2xl p-4 space-y-2 transition-opacity ${!item.is_visible ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2">
                  {/* 排序 */}
                  <div className="flex flex-col gap-0.5 mr-1">
                    <button onClick={() => movePortfolio(i, -1)} className="text-gray-300 hover:text-gray-600 text-xs leading-none">▲</button>
                    <button onClick={() => movePortfolio(i, 1)} className="text-gray-300 hover:text-gray-600 text-xs leading-none">▼</button>
                  </div>
                  <input defaultValue={item.title}
                    onBlur={e => updatePortfolioField(item.id, 'title', e.target.value)}
                    className="flex-1 text-sm font-medium border-b border-transparent hover:border-gray-200 focus:border-gray-400 outline-none py-0.5"
                    placeholder="标题" />
                  {/* 显示/隐藏 */}
                  <button onClick={() => updatePortfolioField(item.id, 'is_visible', !item.is_visible)}
                    className={`text-xs px-2 py-1 rounded-lg flex-shrink-0 ${item.is_visible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {item.is_visible ? '展示' : '隐藏'}
                  </button>
                  <button onClick={() => deletePortfolio(item.id)} className="text-xs text-red-300 hover:text-red-500 flex-shrink-0">删除</button>
                </div>
                <div className="flex gap-2 pl-7">
                  <input defaultValue={item.category}
                    onBlur={e => updatePortfolioField(item.id, 'category', e.target.value)}
                    className="w-28 text-xs text-gray-400 border-b border-transparent hover:border-gray-200 focus:border-gray-400 outline-none"
                    placeholder="分类" />
                  <input defaultValue={item.year}
                    onBlur={e => updatePortfolioField(item.id, 'year', e.target.value)}
                    className="w-14 text-xs text-gray-400 border-b border-transparent hover:border-gray-200 focus:border-gray-400 outline-none"
                    placeholder="年份" />
                </div>
                <input defaultValue={item.description}
                  onBlur={e => updatePortfolioField(item.id, 'description', e.target.value)}
                  className="w-full pl-7 text-xs text-gray-500 border-b border-transparent hover:border-gray-200 focus:border-gray-400 outline-none"
                  placeholder="描述" />
                <input defaultValue={item.cover_url}
                  onBlur={e => updatePortfolioField(item.id, 'cover_url', e.target.value)}
                  className="w-full pl-7 text-xs text-gray-300 border-b border-transparent hover:border-gray-200 focus:border-gray-400 outline-none"
                  placeholder="封面图 URL" />
              </div>
            ))}
          </div>

          {/* 添加新作品 */}
          <div className="border border-gray-100 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-gray-400 tracking-wide">添加新作品</p>
            {[
              { key: 'title', placeholder: '标题 *' },
              { key: 'category', placeholder: '分类（如 PHOTOGRAPHY）' },
              { key: 'year', placeholder: '年份' },
              { key: 'description', placeholder: '描述' },
              { key: 'cover_url', placeholder: '封面图 URL' },
            ].map(({ key, placeholder }) => (
              <input key={key} value={(newPortfolio as any)[key]}
                onChange={e => setNewPortfolio(p => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                placeholder={placeholder} />
            ))}
            <button onClick={addPortfolio}
              className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm hover:opacity-90">
              添加作品
            </button>
          </div>
        </section>
      )}

      {/* ===== 图集 ===== */}
      {tab === 'gallery' && (
        <section>
          <div className="space-y-3 mb-6">
            {galleryItems.length === 0 && <p className="text-xs text-gray-300 text-center py-4">暂无内容，在下方添加</p>}
            {galleryItems.map((item, i) => (
              <div key={item.id} className={`border rounded-2xl p-4 space-y-2 transition-opacity ${!item.is_visible ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5 mr-1">
                    <button onClick={() => moveGallery(i, -1)} className="text-gray-300 hover:text-gray-600 text-xs leading-none">▲</button>
                    <button onClick={() => moveGallery(i, 1)} className="text-gray-300 hover:text-gray-600 text-xs leading-none">▼</button>
                  </div>
                  <input defaultValue={item.title}
                    onBlur={e => updateGalleryField(item.id, 'title', e.target.value)}
                    className="flex-1 text-sm font-medium border-b border-transparent hover:border-gray-200 focus:border-gray-400 outline-none py-0.5"
                    placeholder="标题" />
                  <button onClick={() => updateGalleryField(item.id, 'is_visible', !item.is_visible)}
                    className={`text-xs px-2 py-1 rounded-lg flex-shrink-0 ${item.is_visible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {item.is_visible ? '展示' : '隐藏'}
                  </button>
                  <button onClick={() => deleteGallery(item.id)} className="text-xs text-red-300 hover:text-red-500 flex-shrink-0">删除</button>
                </div>
                <input defaultValue={item.cover_url}
                  onBlur={e => updateGalleryField(item.id, 'cover_url', e.target.value)}
                  className="w-full pl-7 text-xs text-gray-300 border-b border-transparent hover:border-gray-200 focus:border-gray-400 outline-none"
                  placeholder="封面图 URL" />
              </div>
            ))}
          </div>

          <div className="border border-gray-100 rounded-2xl p-5 space-y-3">
            <p className="text-xs text-gray-400 tracking-wide">添加新图集</p>
            {[
              { key: 'title', placeholder: '标题 *' },
              { key: 'cover_url', placeholder: '封面图 URL' },
            ].map(({ key, placeholder }) => (
              <input key={key} value={(newGallery as any)[key]}
                onChange={e => setNewGallery(p => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-gray-400"
                placeholder={placeholder} />
            ))}
            <button onClick={addGallery}
              className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm hover:opacity-90">
              添加图集
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
