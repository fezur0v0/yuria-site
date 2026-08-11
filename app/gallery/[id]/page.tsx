'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import BackButton from '@/components/gallery/BackButton';
import { useIsOwner } from '@/components/gallery/useIsOwner';
import { getScatterStyle } from '@/components/gallery/scatterUtils';
import {
  MdOutlineEdit, MdOutlineAdd, MdOutlineDelete, MdOutlineCheck,
  MdOutlineClose, MdChevronLeft, MdChevronRight,
} from 'react-icons/md';

interface Album { id: string; title: string; description: string | null; }
interface GalleryImage { id: string; image_url: string; caption: string | null; sort_order: number; }

const ZOOM = 2.2;

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const { isOwner } = useIsOwner();
  const supabase = createClient();

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  const [openIndex, setOpenIndex] = useState<number | null>(null); // 打开的沉浸看图，null=散落视图
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  const fetchData = useCallback(() => {
    Promise.all([
      supabase.from('gallery_albums').select('id, title, description').eq('id', albumId).single(),
      supabase.from('gallery_images').select('id, image_url, caption, sort_order').eq('album_id', albumId).order('sort_order', { ascending: true }),
    ]).then(([a, imgs]) => {
      setAlbum(a.data);
      setImages(imgs.data ?? []);
      setLoading(false);
    });
  }, [albumId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `gallery/${albumId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('theater-images').upload(path, file);
    if (uploadError) { alert('上传失败：' + uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('theater-images').getPublicUrl(path);
    const { error: insertError } = await supabase.from('gallery_images').insert({
      album_id: albumId, image_url: urlData.publicUrl, sort_order: images.length,
    });
    if (insertError) alert('保存失败：' + insertError.message);
    fetchData();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    await supabase.from('gallery_images').delete().in('id', Array.from(selected));
    setSelected(new Set());
    fetchData();
  };

  const handleDrop = async (dropIndex: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === dropIndex) return;
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    setImages(reordered);
    await Promise.all(reordered.map((img, idx) => supabase.from('gallery_images').update({ sort_order: idx }).eq('id', img.id)));
    dragIndexRef.current = null;
  };

  const saveCaption = async (id: string, text: string) => {
    await supabase.from('gallery_images').update({ caption: text }).eq('id', id);
    fetchData();
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40 text-sm">加载中...</div>;

  return (
  <div className="min-h-screen bg-[#efe9dc] relative">
      <div className="fixed top-6 left-6 z-50"><BackButton href="/gallery" /></div>

      {isOwner && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white flex items-center justify-center" title="编辑">
              <MdOutlineEdit size={16} />
            </button>
          ) : (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white flex items-center justify-center" title="添加图片">
                <MdOutlineAdd size={18} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              {selected.size > 0 && (
                <button onClick={deleteSelected} className="w-9 h-9 rounded-full bg-red-500/20 backdrop-blur-md text-red-300 hover:bg-red-500/30 flex items-center justify-center" title={`删除 ${selected.size} 张`}>
                  <MdOutlineDelete size={16} />
                </button>
              )}
              <button onClick={() => { setEditMode(false); setSelected(new Set()); }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white flex items-center justify-center" title="退出编辑">
                <MdOutlineClose size={16} />
              </button>
            </>
          )}
        </div>
      )}

      <div className="pt-28 sm:pt-32 px-6 sm:px-16 pb-20 max-w-5xl mx-auto">
        <h1 className="text-center font-serif text-xl sm:text-2xl text-white/70 tracking-wide mb-14">{album?.title}</h1>

        {images.length === 0 ? (
          <p className="text-center text-white/30 text-sm">这个相册还没有图片</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 place-items-center">
            {images.map((img, i) => {
              const { rotate, translateY } = getScatterStyle(img.id);
              const isSelected = selected.has(img.id);
              return (
                <div
                  key={img.id}
                  draggable={editMode}
                  onDragStart={() => { dragIndexRef.current = i; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  onClick={() => {
                    if (editMode) {
                      const next = new Set(selected);
                      isSelected ? next.delete(img.id) : next.add(img.id);
                      setSelected(next);
                    } else {
                      setOpenIndex(i);
                    }
                  }}
                  className="relative bg-white p-2 pb-3 rounded-sm shadow-[0_8px_20px_rgba(0,0,0,0.4)] cursor-pointer transition-transform duration-300 hover:z-10 hover:scale-105 hover:rotate-0"
                  style={{ transform: `rotate(${rotate}deg) translateY(${translateY}px)` }}
                >
                  <div className="w-32 h-32 sm:w-40 sm:h-40 overflow-hidden">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  {editMode && (
                    <div className={`absolute inset-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500/40' : 'bg-black/0'}`}>
                      {isSelected && <MdOutlineCheck size={22} className="text-white" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {uploading && <p className="text-center mt-4 text-white/40 text-xs">上传中...</p>}
      </div>

      {openIndex !== null && (
        <ImmersiveViewer
          images={images}
          startIndex={openIndex}
          isOwner={isOwner}
          onClose={() => setOpenIndex(null)}
          onSaveCaption={saveCaption}
        />
      )}
    </div>
  );
}

function ImmersiveViewer({
  images, startIndex, isOwner, onClose, onSaveCaption,
}: {
  images: GalleryImage[];
  startIndex: number;
  isOwner: boolean;
  onClose: () => void;
  onSaveCaption: (id: string, text: string) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null); // 桌面放大镜
  const [mobileZoomed, setMobileZoomed] = useState(false);
  const [mobileOrigin, setMobileOrigin] = useState({ x: 50, y: 50 });
  const [editingCaption, setEditingCaption] = useState(false);
  const [draft, setDraft] = useState('');
  const touchStartX = useRef(0);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const active = images[index];

  const goPrev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const goNext = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    setHoverPos(null); setMobileZoomed(false); setEditingCaption(false);
  }, [index]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext, onClose]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = imgWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleImageTap = (e: React.MouseEvent) => {
    if (window.innerWidth >= 640) return; // 桌面用 hover，不用点击
    const rect = imgWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (mobileZoomed) {
      setMobileZoomed(false);
    } else {
      setMobileOrigin({ x, y });
      setMobileZoomed(true);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (mobileZoomed) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 60) goPrev();
    else if (delta < -60) goNext();
  };

  // 右下角小预览方块：显示当前放大区域在整张图里的位置
  const rectSize = 100 / ZOOM;
  const rectLeft = hoverPos ? Math.max(0, Math.min(100 - rectSize, hoverPos.x - rectSize / 2)) : 0;
  const rectTop = hoverPos ? Math.max(0, Math.min(100 - rectSize, hoverPos.y - rectSize / 2)) : 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div
        className="absolute inset-0 scale-110 opacity-30 blur-3xl"
        style={{ backgroundImage: `url(${active.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <button onClick={onClose} className="fixed top-6 right-6 z-50 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white flex items-center justify-center">
        <MdOutlineClose size={18} />
      </button>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 text-white/40 text-xs">{index + 1} / {images.length}</div>

      {/* 桌面端左右箭头，放在屏幕两侧，做大一点 */}
      {images.length > 1 && (
        <>
          <button onClick={goPrev} className="hidden sm:flex fixed left-6 top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white items-center justify-center">
            <MdChevronLeft size={32} />
          </button>
          <button onClick={goNext} className="hidden sm:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white/70 hover:bg-white/20 hover:text-white items-center justify-center">
            <MdChevronRight size={32} />
          </button>
        </>
      )}

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <div
          ref={imgWrapRef}
          className="relative max-w-[92vw] sm:max-w-[80vw] max-h-[78vh] overflow-hidden cursor-zoom-in"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPos(null)}
          onClick={handleImageTap}
        >
          <img
            src={active.image_url}
            alt={active.caption ?? ''}
            className="max-w-full max-h-[78vh] object-contain transition-transform duration-150 select-none"
            style={{
              transform: hoverPos
                ? `scale(${ZOOM})`
                : mobileZoomed
                ? `scale(${ZOOM})`
                : 'scale(1)',
              transformOrigin: hoverPos
                ? `${hoverPos.x}% ${hoverPos.y}%`
                : `${mobileOrigin.x}% ${mobileOrigin.y}%`,
            }}
            draggable={false}
          />
        </div>

        {/* 右下角小预览方块，只在桌面 hover 时出现 */}
        {hoverPos && (
          <div className="hidden sm:block fixed bottom-6 right-6 z-50 w-28 h-28 rounded-md overflow-hidden border border-white/20 shadow-lg">
            <div className="relative w-full h-full">
              <img src={active.image_url} alt="" className="w-full h-full object-contain" />
              <div
                className="absolute border-2 border-white/90"
                style={{
                  left: `${rectLeft}%`, top: `${rectTop}%`,
                  width: `${rectSize}%`, height: `${rectSize}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* 备注区：只在没放大时显示，避免跟放大镜打架 */}
        {!hoverPos && !mobileZoomed && (
          <div className="mt-6 min-h-[2rem] text-center max-w-md px-6">
            {editingCaption ? (
              <div className="flex items-center gap-2 justify-center">
                <input
                  autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { onSaveCaption(active.id, draft); setEditingCaption(false); } }}
                  className="bg-white/10 text-white/80 text-sm rounded-full px-4 py-1.5 outline-none border border-white/20 focus:border-white/40"
                  placeholder="写点什么..."
                />
                <button onClick={() => { onSaveCaption(active.id, draft); setEditingCaption(false); }} className="text-white/60 hover:text-white"><MdOutlineCheck size={16} /></button>
                <button onClick={() => setEditingCaption(false)} className="text-white/40 hover:text-white/70"><MdOutlineClose size={16} /></button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2">
                {active.caption && <p className="text-white/50 text-sm font-light">{active.caption}</p>}
                {isOwner && (
                  <button onClick={() => { setDraft(active.caption ?? ''); setEditingCaption(true); }} className="text-white/30 hover:text-white/70">
                    <MdOutlineEdit size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
