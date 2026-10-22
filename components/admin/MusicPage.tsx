'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SortableList } from '@/components/admin/SortableList';
import { MdOutlineDelete } from 'react-icons/md';

const supabase = createClient();

type Track = { id: number; title: string; artist: string; src: string; cover_url: string; sort_order: number };

export default function AdminMusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', src: '', cover_url: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchTracks();
  }, []);

  async function fetchTracks() {
    const { data } = await supabase.from('music_tracks').select('*').order('sort_order');
    setTracks(data || []);
  }

  async function addTrack() {
    if (!newTrack.title || !newTrack.src) return showMsg('请填写歌曲名和链接');
    await supabase.from('music_tracks').insert({ ...newTrack, sort_order: tracks.length + 1 });
    setNewTrack({ title: '', artist: '', src: '', cover_url: '' });
    fetchTracks();
    showMsg('已添加 ✓');
  }

  async function deleteTrack(id: number) {
    await supabase.from('music_tracks').delete().eq('id', id);
    fetchTracks();
  }

  async function handleReorder(newOrder: Track[]) {
    setTracks(newOrder);
    await Promise.all(
      newOrder.map((t, i) => supabase.from('music_tracks').update({ sort_order: i + 1 }).eq('id', t.id))
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
        音乐
      </h1>

      {msg && <div className="text-xs text-green-600 bg-green-50 px-4 py-2 rounded-xl">{msg}</div>}

      <div>
        {tracks.length === 0 && <p className="text-xs text-black/25 text-center py-6">暂无曲目</p>}
        <SortableList
          items={tracks}
          onReorder={handleReorder}
          renderItem={(t, handle) => (
            <div className="flex items-center gap-2 px-3 py-3 bg-white border border-black/[0.06] rounded-xl mb-2">
              {handle}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-black/80 truncate">{t.title}</div>
                <div className="text-xs text-black/35 mt-0.5">{t.artist}</div>
              </div>
              <button
                onClick={() => deleteTrack(t.id)}
                className="text-black/25 hover:text-red-500 transition-colors p-1"
              >
                <MdOutlineDelete size={17} />
              </button>
            </div>
          )}
        />
      </div>

      <div className="border border-black/[0.06] rounded-2xl p-5 space-y-3 bg-white">
        <p className="text-xs text-black/35 tracking-wide">添加新曲目</p>
        {[
          { key: 'title', placeholder: '歌曲名' },
          { key: 'artist', placeholder: '作者' },
          { key: 'src', placeholder: '音乐直链 URL' },
          { key: 'cover_url', placeholder: '封面图 URL' },
        ].map(({ key, placeholder }) => (
          <input
            key={key}
            value={(newTrack as any)[key]}
            onChange={(e) => setNewTrack((p) => ({ ...p, [key]: e.target.value }))}
            className="w-full border border-black/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-black/40"
            placeholder={placeholder}
          />
        ))}
        <button onClick={addTrack} className="w-full bg-black text-white rounded-xl py-2.5 text-sm hover:opacity-90">
          添加曲目
        </button>
      </div>
    </section>
  );
}
