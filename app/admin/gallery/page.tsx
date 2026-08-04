'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { SortableList } from '@/components/admin/SortableList';
import { MdOutlineDelete, MdOutlineVisibility, MdOutlineVisibilityOff, MdOutlineEdit, MdOutlineStar, MdOutlineStarOutline, MdOutlineTune } from 'react-icons/md';

const supabase = createClient();

type Album = {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  is_featured_home: boolean;
};

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbum, setNewAlbum] = useState({ title: '', cover_image_url: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', cover_image_url: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchAlbums(); }, []);

  async function fetchAlbums() {
    const { data } = await supabase.from('gallery_albums').select('*').order('sort_order');
    setAlbums(data || []);
  }

  function showMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  }

  async function addAlbum() {
    if (!newAlbum.title) return showMsg('请填写相册名');
    await supabase.from('gallery_albums').insert({
      ...newAlbum,
      sort_order: albums.length,
    });
    setNewAlbum({ title: '', cover_image_url: '' });
    fetchAlbums();
    showMsg('相册已建好 ✓');
  }

  async function toggleVisible(album: Album) {
    await supabase.from('gallery_albums').update({ is_visible: !album.is_visible }).eq('id', album.id);
    fetchAlbums();
  }

  async function toggleFeaturedHome(album: Album) {
    await supabase.from('gallery_albums').update({ is_featured_home: !album.is_featured_home }).eq('id', album.id);
    fetchAlbums();
  }

  async function deleteAlbum(id: string) {
    await supabase.from('gallery_albums').delete().eq('id', id);
    fetchAlbums();
    showMsg('已删除');
  }

  async function handleReorder(newOrder: Album[]) {
    setAlbums(newOrder);
    await Promise.all(
      newOrder.map((it, i) => supabase.from('gallery_albums').update({ sort_order: i }).eq('id', it.id))
    );
  }

  function startEdit(album: Album) {
    setEditingId(album.id);
    setEditDraft({ title: album.title, cover_image_url: album.cover_image_url || '' });
  }

  async function saveEdit() {
    if (!editingId) return;
    await supabase.from('gallery_albums').update(editDraft).eq('id', editingId);
    setEditingId(null);
    fetchAlbums();
    showMsg('已更新 ✓');
  }

  return (
    <section className="max-w-lg space-y-6">
      <h1 style={{ fontFamily: 'Noto Serif SC,serif' }} className="text-2xl font-light tracking-wide text-black/80">
        图集
      </h1>
      <p className="text-xs text-black/35 -mt-3">管理相册；每个相册里的图片、排序、备注去相册详情页里编辑</p>

      {msg && <div className="text-xs text-green-600 bg-green-50 px-4 py-2 rounded-xl">{msg}</div>}

      <div>
        {albums.length === 0 && <p className="text-xs text-black/25 text-center py-6">暂无相册，在下方新建</p>}
        <SortableList
          items={albums}
          onReorder={handleReorder}
          renderItem={(album, handle) => (
            <div className={`px-3 py-3 bg-white border border-black/[0.06] rounded-xl mb-2 transition-opacity ${!album.is_visible ? 'opacity-40' : ''}`}>
              {editingId === album.id ? (
                <div className="space-y-2 pl-1">
                  <input
                    value={editDraft.title}
                    onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))}
                    className="w-full border border-black/10 rounded-lg px-3 py-1.5 text-sm"
                    placeholder="相册名"
                  />
                  <input
                    value={editDraft.cover_image_url}
                    onChange={(e) => setEditDraft((p) => ({ ...p, cover_image_url: e.target.value }))}
                    className="w-full border border-black/10 rounded-lg px-3 py-1.5 text-sm"
                    placeholder="封面图 URL"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="text-xs bg-black text-white rounded-lg px-3 py-1.5">保存</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-black/40 px-3 py-1.5">取消</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {handle}
                  {album.cover_image_url ? (
                    <img src={album.cover_image_url} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-black/[0.04] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-sm text-black/80 truncate">{album.title}</div>

                  <button onClick={() => toggleFeaturedHome(album)} className="text-black/20 hover:text-black/60 p-1 transition-colors" title="首页精选">
  {album.is_featured_home ? (
    <MdOutlineStar size={17} className="text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]" />
  ) : (
    <MdOutlineStarOutline size={17} />
  )}
               </button>
                  
                  <Link href={`/gallery/${album.id}`} className="text-black/25 hover:text-black/60 p-1" title="编辑相册内的图片">
                    <MdOutlineEdit size={16} />
                  </Link>
                  <button onClick={() => startEdit(album)} className="text-black/25 hover:text-black/60 p-1" title="改名/换封面">
                    <MdOutlineTune size={16} />
                  </button>
                  <button onClick={() => toggleVisible(album)} className="text-black/25 hover:text-black/60 p-1">
                    {album.is_visible ? <MdOutlineVisibility size={17} /> : <MdOutlineVisibilityOff size={17} />}
                  </button>
                  <button onClick={() => deleteAlbum(album.id)} className="text-black/25 hover:text-red-500 p-1">
                    <MdOutlineDelete size={17} />
                  </button>
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div className="border border-black/[0.06] rounded-2xl p-5 space-y-3 bg-white">
        <p className="text-xs text-black/35 tracking-wide">新建相册</p>
        <input
          value={newAlbum.title}
          onChange={(e) => setNewAlbum((p) => ({ ...p, title: e.target.value }))}
          className="w-full border border-black/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-black/40"
          placeholder="相册名"
        />
        <input
          value={newAlbum.cover_image_url}
          onChange={(e) => setNewAlbum((p) => ({ ...p, cover_image_url: e.target.value }))}
          className="w-full border border-black/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-black/40"
          placeholder="封面图 URL（也可以先空着，进相册里传图后再补）"
        />
        <button onClick={addAlbum} className="w-full bg-black text-white rounded-xl py-2.5 text-sm hover:opacity-90">
          新建相册
        </button>
      </div>
    </section>
  );
}
