'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import BackButton from '@/components/gallery/BackButton';
import { useIsOwner } from '@/components/gallery/useIsOwner';
import { MdOutlineEdit, MdOutlineAdd, MdOutlineDelete, MdOutlineCheck, MdOutlineClose } from 'react-icons/md';

interface Album {
  id: string;
  title: string;
  description: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const { isOwner } = useIsOwner();

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  // 编辑相关状态
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const fetchData = useCallback(() => {
    Promise.all([
      supabase.from('gallery_albums').select('id, title, description').eq('id', albumId).single(),
      supabase
        .from('gallery_images')
        .select('id, image_url, caption, sort_order')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true }),
    ]).then(([albumRes, imagesRes]) => {
      setAlbum(albumRes.data);
      setImages(imagesRes.data ?? []);
      setLoading(false);
    });
  }, [albumId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);
  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editMode) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext, editMode]);

  // 上传新图片
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `gallery/${albumId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('theater-images').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('theater-images').getPublicUrl(path);
      await supabase.from('gallery_images').insert({
        album_id: albumId,
        image_url: urlData.publicUrl,
        sort_order: images.length,
      });
      fetchData();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 保存备注
  const saveCaption = async () => {
    const active = images[current];
    if (!active) return;
    await supabase.from('gallery_images').update({ caption: captionDraft }).eq('id', active.id);
    setEditingCaption(false);
    fetchData();
  };

  // 删除选中的图片
  const deleteSelected = async () => {
    if (selected.size === 0) return;
    await supabase.from('gallery_images').delete().in('id', Array.from(selected));
    setSelected(new Set());
    setCurrent(0);
    fetchData();
  };

  // 拖拽排序（缩略图条）
  const dragIndexRef = useRef<number | null>(null);
  const handleDragStart = (i: number) => { dragIndexRef.current = i; };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (i: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === i) return;
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(i, 0, moved);
    setImages(reordered);
    await Promise.all(
      reordered.map((img, idx) => supabase.from('gallery_images').update({ sort_order: idx }).eq('id', img.id))
    );
    dragIndexRef.current = null;
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40 text-sm">加载中...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-white/40 text-sm">
        <p>这个相册还没有图片</p>
        {isOwner && (
          <label className="px-4 py-2 rounded-full bg-white/10 text-white/70 text-xs cursor-pointer hover:bg-white/20">
            添加第一张图
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        )}
        <BackButton href="/gallery" />
      </div>
    );
  }

  const active = images[current];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div
        className="absolute inset-0 scale-110 opacity-40 blur-3xl transition-all duration-500"
        style={{ backgroundImage: `url(${active.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="fixed top-6 left-6 z-50">
        <BackButton href="/gallery" />
      </div>

      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        {isOwner && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all"
            title="编辑"
          >
            <MdOutlineEdit size={16} />
          </button>
        )}
        {isOwner && editMode && (
          <>
            <label className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all cursor-pointer" title="添加图片">
              <MdOutlineAdd size={18} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="w-9 h-9 rounded-full bg-red-500/20 backdrop-blur-md text-red-300 hover:bg-red-500/30 flex items-center justify-center transition-all"
                title={`删除选中的 ${selected.size} 张`}
              >
                <MdOutlineDelete size={16} />
              </button>
            )}
            <button
              onClick={() => { setEditMode(false); setSelected(new Set()); }}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white flex items-center justify-center transition-all"
              title="退出编辑"
            >
              <MdOutlineClose size={16} />
            </button>
          </>
        )}
        <div className="text-right">
          <p className="text-white/70 text-sm font-serif tracking-wide">{album?.title}</p>
          <p className="text-white/30 text-xs mt-0.5">{current + 1} / {images.length}</p>
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-20">
        <div className="relative flex items-center justify-center w-full max-w-4xl">
          {images.length > 1 && !editMode && (
            <button onClick={goPrev} className="absolute left-0 sm:-left-16 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center">‹</button>
          )}

          <img
            src={active.image_url}
            alt={active.caption ?? ''}
            className="max-h-[65vh] max-w-full object-contain rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-opacity duration-300"
          />

          {images.length > 1 && !editMode && (
            <button onClick={goNext} className="absolute right-0 sm:-right-16 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center">›</button>
          )}
        </div>

        {/* 备注区：鼠标移上去出现编辑图标，只有本人能编辑 */}
        <div className="group mt-6 min-h-[2.5rem] text-center max-w-md px-4 relative">
          {editingCaption ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveCaption()}
                className="bg-white/10 text-white/80 text-sm rounded-full px-4 py-1.5 outline-none border border-white/20 focus:border-white/40"
                placeholder="写点什么..."
              />
              <button onClick={saveCaption} className="text-white/60 hover:text-white"><MdOutlineCheck size={16} /></button>
              <button onClick={() => setEditingCaption(false)} className="text-white/40 hover:text-white/70"><MdOutlineClose size={16} /></button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2">
              <p className="text-white/50 text-sm font-light leading-relaxed">{active.caption}</p>
              {isOwner && (
                <button
                  onClick={() => { setCaptionDraft(active.caption ?? ''); setEditingCaption(true); }}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-opacity"
                >
                  <MdOutlineEdit size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 底部缩略图条：编辑模式下可勾选/拖拽排序 */}
        {images.length > 1 && (
          <div className="mt-8 flex gap-2 overflow-x-auto max-w-full px-4 pb-2 [&::-webkit-scrollbar]:hidden">
            {images.map((img, i) => (
              <div
                key={img.id}
                draggable={editMode}
                onDragStart={() => handleDragStart(i)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(i)}
                onClick={() => {
                  if (editMode) {
                    const next = new Set(selected);
                    next.has(img.id) ? next.delete(img.id) : next.add(img.id);
                    setSelected(next);
                  } else {
                    setCurrent(i);
                  }
                }}
                className={`relative shrink-0 w-14 h-14 rounded-sm overflow-hidden transition-all duration-200 cursor-pointer ${
                  editMode
                    ? selected.has(img.id) ? 'ring-2 ring-red-400' : 'ring-1 ring-white/20 opacity-70 hover:opacity-100'
                    : i === current ? 'ring-2 ring-white/80 opacity-100' : 'ring-1 ring-white/10 opacity-50 hover:opacity-80'
                }`}
              >
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                {editMode && selected.has(img.id) && (
                  <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                    <MdOutlineCheck size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {uploading && <p className="mt-3 text-white/40 text-xs">上传中...</p>}
      </div>
    </div>
  );
}
