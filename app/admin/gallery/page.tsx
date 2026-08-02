'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SortableList } from '@/components/admin/SortableList';
import { MdOutlineDelete, MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md';

const supabase = createClient();

type GalleryItem = { id: string; title: string; cover_url: string; sort_order: number; is_visible: boolean };

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [newItem, setNewItem] = useState({ title: '', cover_url: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    const { data } = await supabase.from('homepage_gallery').select('*').order('sort_order');
    setItems(data || []);
  }

  async function addItem() {
    if (!newItem.title) return showMsg('请填写标题');
    await supabase.from('homepage_gallery').insert({ ...newItem, sort_order: items.length, is_visible: true });
    setNewItem({ title: '', cover_url: '' });
    fetchItems();
    showMsg('已添加 ✓');
  }

  async function toggleVisible(item: GalleryItem) {
    await supabase.from('homepage_gallery').update({ is_visible: !item.is_visible }).eq('id', item.id);
    fetchItems();
  }

  async function deleteItem(id: string) {
    await supabase.from('homepage_gallery').delete().eq('id', id);
    fetchItems();
  }

  async function handleReorder(newOrder: GalleryItem[]) {
    setItems(newOrder);
    await Promise.all(
      newOrder.map((it, i) => supabase.from('homepage_gallery').update({ sort_order: i }).eq('id', it.id))
    );
  }

  function showMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  }

  return (
    <section className="max-w-lg space-y-6">
      <h1
        style={{ fontFamily: 'Noto Serif SC,serif' }}
        className="text-2xl font-light tracking-wide text-black/80"
      >
        图集
      </h1>
      <p className="text-xs text-black/35 -mt-3">图集模块还没正式做，这里暂时还是占位数据</p>

      {msg && <div className="text-xs text-green-600 bg-green-50 px-4 py-2 rounded-xl">{msg}</div>}

      <div>
        {items.length === 0 && <p className="text-xs text-black/25 text-center py-6">暂无内容，在下方添加</p>}
        <SortableList
          items={items}
          onReorder={handleReorder}
          renderItem={(item, handle) => (
            <div
              className={`flex items-center gap-2 px-3 py-3 bg-white border border-black/[0.06] rounded-xl mb-2 transition-opacity ${
                !item.is_visible ? 'opacity-40' : ''
              }`}
            >
              {handle}
              {item.cover_url ? (
                <img src={item.cover_url} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-black/[0.04] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 text-sm text-black/80 truncate">{item.title}</div>
              <button onClick={() => toggleVisible(item)} className="text-black/25 hover:text-black/60 p-1">
                {item.is_visible ? <MdOutlineVisibility size={17} /> : <MdOutlineVisibilityOff size={17} />}
              </button>
              <button onClick={() => deleteItem(item.id)} className="text-black/25 hover:text-red-500 p-1">
                <MdOutlineDelete size={17} />
              </button>
            </div>
          )}
        />
      </div>

      <div className="border border-black/[0.06] rounded-2xl p-5 space-y-3 bg-white">
        <p className="text-xs text-black/35 tracking-wide">添加新图集</p>
        {[
          { key: 'title', placeholder: '标题' },
          { key: 'cover_url', placeholder: '封面图 URL' },
        ].map(({ key, placeholder }) => (
          <input
            key={key}
            value={(newItem as any)[key]}
            onChange={(e) => setNewItem((p) => ({ ...p, [key]: e.target.value }))}
            className="w-full border border-black/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-black/40"
            placeholder={placeholder}
          />
        ))}
        <button onClick={addItem} className="w-full bg-black text-white rounded-xl py-2.5 text-sm hover:opacity-90">
          添加图集
        </button>
      </div>
    </section>
  );
}
