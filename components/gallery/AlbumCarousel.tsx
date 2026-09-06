'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import AlbumStackCard, { type GalleryAlbum } from './AlbumStackCard';
import { useReducedMotion } from './useReducedMotion';
import styles from './gallery-home.module.css';

const storageKey = 'yuria:gallery:active-album';
const modulo = (value: number, length: number) => ((value % length) + length) % length;
function offset(index: number, active: number, length: number) {
  let value = modulo(index - active, length);
  if (value > length / 2) value -= length;
  return value;
}

export default function AlbumCarousel({ albums }: { albums: GalleryAlbum[] }) {
  const [active, setActive] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return Math.max(0, albums.findIndex((album) => album.id === saved));
    } catch { return 0; }
  });
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const links = useRef(new Map<number, HTMLAnchorElement>());
  const gesture = useRef<{ id: number; x: number; y: number; width: number; dx: number; moved: boolean; vertical: boolean } | null>(null);
  const suppressClickUntil = useRef(0);
  const [previousActive, setPreviousActive] = useState(active);
  const frame = useRef<number | null>(null);
  const pendingDrag = useRef(0);
  const focusOnChange = useRef(false);
  const count = albums.length;

  const select = useCallback((index: number, focus = false) => {
    const next = modulo(index, count);
    focusOnChange.current = focus;
    setPreviousActive(active);
    setActive(next);
    try { sessionStorage.setItem(storageKey, albums[next].id); } catch { /* Storage is optional. */ }
    if (focus && next === active) links.current.get(next)?.focus({ preventScroll: true });
  }, [active, albums, count]);

  useEffect(() => {
    if (focusOnChange.current) {
      links.current.get(active)?.focus({ preventScroll: true });
      focusOnChange.current = false;
    }
  }, [active]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  function resetDrag() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setDrag(0);
    setDragging(false);
  }
  function start(event: PointerEvent<HTMLDivElement>) {
    if (count < 2 || !event.isPrimary || event.button !== 0 || gesture.current) return;
    const width = links.current.get(active)?.offsetWidth ?? 300;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width, dx: 0, moved: false, vertical: false };
    suppressClickUntil.current = 0;
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || current.vertical) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { current.vertical = true; return; }
      if (Math.abs(dx) < 8) return;
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    current.dx = dx;
    pendingDrag.current = Math.max(-0.95, Math.min(0.95, dx / (current.width * 0.64)));
    if (frame.current === null) frame.current = requestAnimationFrame(() => {
      setDrag(pendingDrag.current);
      frame.current = null;
    });
  }
  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    if (current.moved || current.vertical) suppressClickUntil.current = performance.now() + 450;
    if (!cancelled && current.moved && Math.abs(current.dx) > current.width * 0.16) {
      select(active + (current.dx < 0 ? 1 : -1));
    }
    resetDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section className={styles.carousel} aria-label="选择相册" aria-roledescription="轮播"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const next = event.key === 'ArrowLeft' ? active - 1 : event.key === 'ArrowRight' ? active + 1
          : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
        if (next !== null) { event.preventDefault(); select(next, true); }
      }}>
      <div className={styles.stage} ref={stage} data-dragging={dragging}
        onPointerDown={start} onPointerMove={move} onPointerUp={(event) => finish(event)}
        onPointerCancel={(event) => finish(event, true)} onLostPointerCapture={(event) => finish(event, true)}
        onClickCapture={(event) => {
          if (performance.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
        }}>
        {albums.map((album, index) => {
          const slot = offset(index, active, count);
          const distance = slot + drag;
          const depth = Math.abs(distance);
          const visible = Math.abs(slot) <= 2;
          // A card crossing the circular seam resets behind the stage instead of flying across the front.
          const crossedSeam = Math.abs(slot - offset(index, previousActive, count)) > 1;
          const style = {
            '--position': distance,
            '--scale': Math.max(0.65, 1 - depth * 0.12),
            '--turn': reduced ? '0deg' : `${distance * -13}deg`,
            '--drop': `${Math.min(depth, 2) * 10}px`,
            zIndex: 10 - Math.abs(slot),
            opacity: visible ? 1 : 0,
            transition: dragging || crossedSeam || reduced ? 'none' : undefined,
          } as CSSProperties;
          return (
            <Link key={album.id} href={`/gallery/${album.id}`} prefetch={false}
              ref={(element) => { if (element) links.current.set(index, element); else links.current.delete(index); }}
              className={styles.slide} style={style} data-slot={Math.abs(slot)} data-active={index === active}
              aria-label={index === active ? `打开相册：${album.title}` : `选择相册：${album.title}`}
              aria-hidden={!visible} inert={!visible} tabIndex={index === active ? 0 : -1}
              onClick={(event) => {
                if (index !== active) { event.preventDefault(); select(index); }
                else { try { sessionStorage.setItem(storageKey, album.id); } catch { /* Optional. */ } }
              }} draggable={false}>
              <AlbumStackCard album={album} active={index === active} />
            </Link>
          );
        })}
      </div>
      {count > 1 && <>
        <button className={`${styles.arrow} ${styles.previous}`} aria-label="上一个相册" onClick={() => select(active - 1)}><MdChevronLeft size={28} aria-hidden="true" /></button>
        <button className={`${styles.arrow} ${styles.next}`} aria-label="下一个相册" onClick={() => select(active + 1)}><MdChevronRight size={28} aria-hidden="true" /></button>
        <div className={styles.dots} aria-label="相册分页">
          {albums.map((album, index) => <button key={album.id} className={styles.dotButton}
            aria-label={`切换到相册：${album.title}`} aria-current={index === active ? 'true' : undefined}
            onClick={() => select(index)}><span className={styles.dot} /></button>)}
        </div>
      </>}
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">当前相册：{albums[active].title}</p>
    </section>
  );
}
