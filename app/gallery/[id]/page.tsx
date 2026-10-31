'use client';

import { useEffect, useState, useCallback, useRef, useId } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/content/client';
import PortfolioNav from '@/components/PortfolioNav';
import { useIsOwner } from '@/components/gallery/useIsOwner';
import detailStyles from '@/components/gallery/gallery-detail.module.css';
import {
  MdOutlineEdit, MdOutlineAdd, MdOutlineDelete, MdOutlineCheck,
  MdOutlineClose, MdChevronLeft, MdChevronRight, MdOutlineZoomIn, MdOutlineZoomOut,
  MdOutlinePlayCircle,
} from 'react-icons/md';
import { uploadPublicMedia, deletePublicMedia } from '@/utils/r2/client';
import { isVideoUrl } from '@/utils/media';

interface Album { id: string; title: string; description: string | null; }
interface GalleryImage { id: string; image_url: string; caption: string | null; sort_order: number; }

function AlbumAtmosphere() {
  const id = useId();
  return <div className={detailStyles.heroBackdrop} aria-hidden="true">
    <div className={detailStyles.dotField} />
    <svg className={detailStyles.softCube} viewBox="0 0 400 400" fill="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-top`} x1="85" y1="65" x2="240" y2="125" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".02" /><stop offset="1" stopColor="white" stopOpacity=".62" />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="285" y1="125" x2="155" y2="305" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".85" /><stop offset=".48" stopColor="white" stopOpacity=".3" /><stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="118" y1="135" x2="67" y2="235" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity=".26" /><stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <g filter={`url(#${id}-blur)`}>
        <path d="M60 60H250L310 120H120Z" fill={`url(#${id}-top)`} />
        <path d="M120 120H310V310H120Z" fill={`url(#${id}-front)`} />
        <path d="M60 60L120 120V310L60 250Z" fill={`url(#${id}-side)`} />
      </g>
      <path d="M54 60H66M60 54V66M244 60H256M250 54V66M304 120H316M310 114V126M304 310H316M310 304V316" stroke="currentColor" strokeWidth="1" />
    </svg>
  </div>;
}

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const { isOwner } = useIsOwner();
  const content = createClient();
  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  const viewerTrigger = useRef<HTMLButtonElement | null>(null);

  const fetchData = useCallback(async (signal = new AbortController().signal) => {
    setLoadError('');
    try {
      const [a, imgs] = await Promise.all([
        content.from('gallery_albums').select('id, title, description').eq('id', albumId).abortSignal(signal).single(),
        content.from('gallery_images').select('id, image_url, caption, sort_order').eq('album_id', albumId).order('sort_order', { ascending: true }).abortSignal(signal),
      ]);
      if (signal.aborted) return;
      if (a.error && a.error.code !== 'PGRST116') throw a.error;
      if (imgs.error) throw imgs.error;
      setAlbum(a.data);
      setImages(imgs.data ?? []);
    } catch {
      if (!signal.aborted) setLoadError('相册暂时无法加载，请稍后重试。');
    } finally { if (!signal.aborted) setLoading(false); }
  }, [albumId, content]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setAlbum(null);
    setImages([]);
    setOpenIndex(null);
    setEditMode(false);
    setSelected(new Set());
    setNotice('');
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const closeViewer = useCallback(() => {
    setOpenIndex(null);
    requestAnimationFrame(() => viewerTrigger.current?.focus({ preventScroll: true }));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;
    setUploading(true);
    setNotice('');
    let publicUrl: string | null = null;
    try {
      publicUrl = await uploadPublicMedia(file, `gallery/${albumId}`);
      const { error } = await content.from('gallery_images').insert({ album_id: albumId, image_url: publicUrl, sort_order: images.length });
      if (error) { await deletePublicMedia(publicUrl).catch(() => undefined); throw error; }
      await fetchData();
    } catch (error) { setNotice('上传失败：' + (error instanceof Error ? error.message : '请稍后重试')); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const deleteSelected = async () => {
    if (!isOwner || selected.size === 0 || mutating) return;
    const selectedImages = images.filter(image => selected.has(image.id));
    setMutating(true);
    setNotice('');
    try {
      const { error } = await content.from('gallery_images').delete().in('id', Array.from(selected));
      if (error) throw error;
      const cleanup = await Promise.allSettled(selectedImages.map(image => deletePublicMedia(image.image_url)));
      if (cleanup.some(result => result.status === 'rejected')) setNotice('记录已删除，但有文件未能从 R2 清理。');
      setSelected(new Set());
      await fetchData();
    } catch { setNotice('删除未完成，请刷新后重试。'); }
    finally { setMutating(false); }
  };

  const handleDrop = async (dropIndex: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (!isOwner || !editMode || mutating || from === null || from === dropIndex) return;
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    setImages(reordered);
    setMutating(true);
    setNotice('');
    try {
      const results = await Promise.all(reordered.map((img, idx) => content.from('gallery_images').update({ sort_order: idx }).eq('id', img.id)));
      if (results.some(result => result.error)) throw new Error('sort failed');
    } catch { setNotice('顺序未保存，请重试。'); await fetchData(); }
    finally { setMutating(false); }
  };

  const saveCaption = async (id: string, text: string) => {
    const { error } = await content.from('gallery_images').update({ caption: text }).eq('id', id);
    if (error) throw error;
    setImages(current => current.map(image => image.id === id ? { ...image, caption: text } : image));
  };

  const videos = images.filter(image => isVideoUrl(image.image_url)).length;
  const busy = uploading || mutating;

  return <div className={detailStyles.page}>
    <div inert={openIndex !== null}>
      <PortfolioNav showSections />
      <main className={detailStyles.main}>
        {isOwner && album && <div className={detailStyles.utility}>
          <div className={detailStyles.toolbar} aria-label="相册编辑工具" data-editing={editMode}>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className={detailStyles.hiddenInput} onChange={handleUpload} />
            {!editMode ? <button type="button" onClick={() => setEditMode(true)} className={detailStyles.toolButton} aria-label="进入编辑模式"><MdOutlineEdit size={19} /></button> : <>
              <span className={detailStyles.editStatus}>{selected.size ? `${selected.size} SELECTED` : 'EDIT MODE'}</span>
              <button type="button" onClick={() => fileInputRef.current?.click()} className={detailStyles.toolButton} aria-label={uploading ? '文件上传中' : '添加图片或视频'} aria-busy={uploading} disabled={busy}>{uploading ? <span className={detailStyles.busySpinner} /> : <MdOutlineAdd size={21} />}</button>
              {selected.size > 0 && <button type="button" onClick={deleteSelected} className={detailStyles.toolButton} aria-label={`删除已选中的 ${selected.size} 张图片`} disabled={busy}><MdOutlineDelete size={19} /></button>}
              <button type="button" onClick={() => { setEditMode(false); setSelected(new Set()); }} className={`${detailStyles.toolButton} ${detailStyles.doneButton}`} aria-label="完成编辑" disabled={busy}><MdOutlineCheck size={21} /></button>
            </>}
          </div>
        </div>}

        {loading ? <div className={detailStyles.loading} role="status"><span className={detailStyles.skeleton} aria-hidden="true" /><span>LOADING THE ARCHIVE…</span></div> : loadError ? <div className={detailStyles.message} role="alert"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); void fetchData(); }}>重试</button></div> : !album ? <div className={detailStyles.message}><h1>相册未找到</h1><p>这个相册暂时无法访问。</p></div> : <>
          <header className={detailStyles.hero}>
            <AlbumAtmosphere />
            <div className={detailStyles.heroTop}>
              <div className={detailStyles.archiveBadge}><span>ARCHIVE</span><strong>{String(images.length).padStart(2, '0')}</strong><span>FILES</span></div>
              <p className={detailStyles.eyebrow}>YURIA<br />VISUAL COLLECTION</p>
            </div>
            <div className={detailStyles.heroCopy}>
              <h1>{album.title}</h1>
              <span className={detailStyles.heroTag}>A COLLECTION OF MOMENTS</span>
            </div>
            <div className={detailStyles.heroBottom}>
              {album.description && <p className={detailStyles.description}>{album.description}</p>}
              <p className={detailStyles.mediaCounts}><span>{String(images.length - videos).padStart(2, '0')} <small>IMAGES</small></span><span>{String(videos).padStart(2, '0')} <small>MOTION</small></span></p>
            </div>
          </header>

          <section className={detailStyles.contactSheet} aria-label="相册照片与视频">
            <div className={detailStyles.sheetMeta}><span>THE CONTACT SHEET</span><span>{editMode ? '点击选择 · 拖动调整顺序' : 'SELECT A FRAME TO EXPLORE'}</span></div>
            {notice && <p className={detailStyles.notice} role="alert">{notice}</p>}
            {busy && <p className={detailStyles.workStatus} role="status">{uploading ? '文件上传中…' : '正在保存…'}</p>}
            {images.length === 0 ? <div className={detailStyles.empty}><span aria-hidden="true">[ — ]</span><p>这个相册还没有影像</p>{isOwner && <button type="button" onClick={() => { setEditMode(true); fileInputRef.current?.click(); }}>添加第一份影像</button>}</div> : <div className={detailStyles.photoGrid} data-editing={editMode}>
              {images.map((img, i) => {
                const isSelected = selected.has(img.id), isVideo = isVideoUrl(img.image_url);
                return <figure className={detailStyles.mediaItem} key={img.id} data-slot={i % 6} onDragOver={e => { if (editMode) e.preventDefault(); }} onDrop={() => void handleDrop(i)}>
                  <button type="button" className={detailStyles.photoCard} draggable={editMode && !busy} onDragStart={() => { dragIndexRef.current = i; }} onDragEnd={() => { dragIndexRef.current = null; }} data-selected={editMode && isSelected} aria-label={editMode ? `${isSelected ? '取消选择' : '选择'}第 ${i + 1} 个文件` : `打开第 ${i + 1} 个文件`} aria-pressed={editMode ? isSelected : undefined} onClick={event => {
                    if (editMode) { const next = new Set(selected); if (isSelected) next.delete(img.id); else next.add(img.id); setSelected(next); }
                    else { viewerTrigger.current = event.currentTarget; setOpenIndex(i); }
                  }}>
                    <span className={detailStyles.photoFrame}>
                      {isVideo ? <><video src={img.image_url} muted playsInline preload="metadata" className={detailStyles.photoMedia} /><span className={detailStyles.videoBadge} aria-hidden="true"><MdOutlinePlayCircle size={36} /></span></> : <img src={img.image_url} alt="" className={detailStyles.photoMedia} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} />}
                      <span className={detailStyles.photoCorners} aria-hidden="true" />
                      {editMode && isSelected ? <span className={detailStyles.selectionSticker} aria-hidden="true"><MdOutlineCheck size={22} /></span> : <span className={detailStyles.viewMark} aria-hidden="true">{editMode ? 'SELECT' : 'VIEW'} <span>+</span></span>}
                    </span>
                  </button>
                  <figcaption className={detailStyles.photoCaption}><span className={detailStyles.frameNumber}>{String(i + 1).padStart(2, '0')} / {isVideo ? 'MOTION' : 'IMAGE'}</span>{img.caption && <p>{img.caption}</p>}</figcaption>
                </figure>;
              })}
            </div>}
          </section>
          <footer className={detailStyles.footer}><span>YURIA / VISUAL ARCHIVE</span><span>END OF COLLECTION</span></footer>
        </>}
      </main>
    </div>
    {openIndex !== null && images.length > 0 && <ImmersiveViewer images={images} startIndex={Math.min(openIndex, images.length - 1)} isOwner={isOwner} onClose={closeViewer} onSaveCaption={saveCaption} />}
  </div>;
}

function ImmersiveViewer({
  images, startIndex, isOwner, onClose, onSaveCaption,
}: {
  images: GalleryImage[];
  startIndex: number;
  isOwner: boolean;
  onClose: () => void;
  onSaveCaption: (id: string, text: string) => Promise<void>;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1); // 1 = 100%
  const [editingCaption, setEditingCaption] = useState(false);
  const [draft, setDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [captionError, setCaptionError] = useState('');
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const pendingPan = useRef<{ x: number; y: number } | null>(null);
  const panFrame = useRef<number | null>(null);

  const active = images[index];
  const activeIsVideo = isVideoUrl(active.image_url);
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  const clampPan = useCallback((x: number, y: number, scale: number) => {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image || scale <= 1) return { x: 0, y: 0 };
    const maxX = Math.max(0, (image.offsetWidth * scale - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * scale - viewport.clientHeight) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  const softenPan = useCallback((x: number, y: number, scale: number) => {
    const clamped = clampPan(x, y, scale);
    const softenAxis = (value: number, edge: number) => {
      const overflow = value - edge;
      if (overflow === 0) return edge;
      return edge + Math.sign(overflow) * Math.min(42, Math.abs(overflow) * 0.22);
    };
    return { x: softenAxis(x, clamped.x), y: softenAxis(y, clamped.y) };
  }, [clampPan]);

  const applyPan = useCallback((next: { x: number; y: number }) => {
    if (panFrame.current !== null) cancelAnimationFrame(panFrame.current);
    panFrame.current = null;
    pendingPan.current = null;
    panRef.current = next;
    setPan(next);
  }, []);

  const queuePan = useCallback((next: { x: number; y: number }) => {
    panRef.current = next;
    pendingPan.current = next;
    if (panFrame.current !== null) return;
    panFrame.current = requestAnimationFrame(() => {
      panFrame.current = null;
      if (pendingPan.current) setPan(pendingPan.current);
      pendingPan.current = null;
    });
  }, []);

  const resetForNavigation = useCallback(() => {
    setEditingCaption(false);
    setCaptionError('');
    applyPan({ x: 0, y: 0 });
    gesture.current = null;
    setDragging(false);
    setZoom(1);
  }, [applyPan]);

  const goPrev = useCallback(() => {
    resetForNavigation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length, resetForNavigation]);
  const goNext = useCallback(() => {
    resetForNavigation();
    setIndex((i) => (i + 1) % images.length);
  }, [images.length, resetForNavigation]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const resize = () => applyPan(clampPan(panRef.current.x, panRef.current.y, zoom));
    const observer = new ResizeObserver(resize);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (imageRef.current) observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [applyPan, clampPan, zoom, index]);

  useEffect(() => () => {
    if (panFrame.current !== null) cancelAnimationFrame(panFrame.current);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), video[controls]')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (!dialog.contains(document.activeElement)) { e.preventDefault(); first?.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (editingCaption) { setEditingCaption(false); setCaptionError(''); }
        else onClose();
        return;
      }
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.matches('input, textarea, select'))) return;
      if (zoom === 1 && e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (zoom === 1 && e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext, onClose, zoom, editingCaption]);

  const submitCaption = async () => {
    if (!isOwner || savingCaption) return;
    setSavingCaption(true);
    setCaptionError('');
    try { await onSaveCaption(active.id, draft); setEditingCaption(false); }
    catch { setCaptionError('备注未保存，请重试。'); }
    finally { setSavingCaption(false); }
  };

  const changeZoom = (value: number) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    gesture.current = null;
    setDragging(false);
    setZoom(next);
    applyPan(clampPan(panRef.current.x, panRef.current.y, next));
  };
  const zoomIn = () => changeZoom(zoom + ZOOM_STEP);
  const zoomOut = () => changeZoom(zoom - ZOOM_STEP);
  const zoomReset = () => changeZoom(1);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || gesture.current) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(zoom > 1);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || start.id !== e.pointerId || zoom === 1) return;
    queuePan(softenPan(start.panX + e.clientX - start.x, start.panY + e.clientY - start.y, zoom));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || start.id !== e.pointerId) return;
    gesture.current = null;
    setDragging(false);
    applyPan(clampPan(panRef.current.x, panRef.current.y, zoom));
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (zoom !== 1 || e.pointerType === 'mouse' || images.length < 2) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) goPrev(); else goNext();
    }
  };

  const cancelPointer = () => {
    gesture.current = null;
    setDragging(false);
    applyPan(clampPan(panRef.current.x, panRef.current.y, zoom));
  };

  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="沉浸式媒体查看器" className={detailStyles.viewer}>
    <header className={detailStyles.viewerHeader}>
      <span>FRAME / {String(index + 1).padStart(2, '0')}<span className={detailStyles.viewerHeaderDetail}> — {activeIsVideo ? 'MOTION' : 'IMAGE'}</span></span>
      <button type="button" autoFocus aria-label="关闭看图器" onClick={onClose} className={detailStyles.viewerButton}><MdOutlineClose size={23} /></button>
    </header>
    <div ref={viewportRef} className={detailStyles.viewerViewport}
      style={{ touchAction: activeIsVideo ? 'auto' : 'none', cursor: activeIsVideo ? 'default' : zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      onPointerDown={activeIsVideo ? undefined : onPointerDown} onPointerMove={activeIsVideo ? undefined : onPointerMove}
      onPointerUp={activeIsVideo ? undefined : onPointerUp} onPointerCancel={activeIsVideo ? undefined : cancelPointer}
      onLostPointerCapture={activeIsVideo ? undefined : cancelPointer}
      onDoubleClick={activeIsVideo ? undefined : () => changeZoom(zoom > 1 ? 1 : 2)}>
      {failedUrl === active.image_url ? <div className={detailStyles.mediaError} role="alert"><p>这份影像暂时无法显示</p><button type="button" onClick={() => setFailedUrl(null)}>重新加载</button></div> : activeIsVideo ? <video key={active.id} src={active.image_url} controls autoPlay playsInline className={detailStyles.viewerMedia} onError={() => setFailedUrl(active.image_url)} /> : <img key={active.id} ref={imageRef} src={active.image_url} alt={active.caption ?? ''} className={detailStyles.viewerMedia}
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, transition: dragging ? 'none' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        onLoad={() => applyPan(clampPan(panRef.current.x, panRef.current.y, zoom))} onError={() => setFailedUrl(active.image_url)} draggable={false} />}
    </div>
    <footer className={detailStyles.viewerFooter}>
      <div className={detailStyles.captionArea}>
        {zoom === 1 && (editingCaption ? <form className={detailStyles.captionForm} onSubmit={event => { event.preventDefault(); void submitCaption(); }}>
          <input aria-label="照片备注" autoFocus value={draft} onChange={event => setDraft(event.target.value)} placeholder="写点什么…" disabled={savingCaption} />
          <button type="submit" className={detailStyles.viewerButton} aria-label="保存备注" disabled={savingCaption}>{savingCaption ? <span className={detailStyles.busySpinner} /> : <MdOutlineCheck size={21} />}</button>
          <button type="button" className={detailStyles.viewerButton} aria-label="取消编辑备注" disabled={savingCaption} onClick={() => { setEditingCaption(false); setCaptionError(''); }}><MdOutlineClose size={21} /></button>
        </form> : <div className={detailStyles.captionText}>{active.caption && <p>{active.caption}</p>}{isOwner && <button type="button" className={detailStyles.viewerButton} aria-label="编辑备注" onClick={() => { setDraft(active.caption ?? ''); setEditingCaption(true); }}><MdOutlineEdit size={18} /></button>}</div>)}
        {captionError && <p className={detailStyles.captionError} role="alert">{captionError}</p>}
      </div>
      <div className={detailStyles.viewerControls}>
        {zoom === 1 ? <div className={detailStyles.controlGroup}>
          <button type="button" className={detailStyles.viewerButton} aria-label="上一张" onClick={goPrev} disabled={images.length < 2 || savingCaption}><MdChevronLeft size={25} /></button>
          <span className={detailStyles.viewerCounter} aria-live="polite">{index + 1}/{images.length}</span>
          <button type="button" className={detailStyles.viewerButton} aria-label="下一张" onClick={goNext} disabled={images.length < 2 || savingCaption}><MdChevronRight size={25} /></button>
        </div> : <span className={detailStyles.panHint}>{index + 1}/{images.length} · 拖动查看</span>}
        {!activeIsVideo && <div className={detailStyles.controlGroup}>
          <button type="button" className={detailStyles.viewerButton} aria-label="缩小" onClick={zoomOut} disabled={zoom <= MIN_ZOOM}><MdOutlineZoomOut size={22} /></button>
          <button type="button" className={`${detailStyles.viewerButton} ${detailStyles.zoomValue}`} aria-label="还原到适应屏幕" onClick={zoomReset}>{Math.round(zoom * 100)}%</button>
          <button type="button" className={detailStyles.viewerButton} aria-label="放大" onClick={zoomIn} disabled={zoom >= MAX_ZOOM}><MdOutlineZoomIn size={22} /></button>
        </div>}
      </div>
    </footer>
  </div>;
}
