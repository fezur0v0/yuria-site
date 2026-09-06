'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import AlbumStackCard, { type GalleryAlbum } from './AlbumStackCard';
import { useReducedMotion } from './useReducedMotion';
import styles from './gallery-home.module.css';

const storageKey = 'yuria:gallery:active-album';
const casualTilts = [-1.1, 0.7, -0.45, 1.15, -0.75];
const casualOffsets = [-2, 3, 0, -3, 2];
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
  const tiltFrame = useRef<number | null>(null);
  const tiltedLink = useRef<HTMLAnchorElement | null>(null);
  const tiltRect = useRef<DOMRect | null>(null);
  const pendingTilt = useRef({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const focusOnChange = useRef(false);
  const count = albums.length;

  const resetTilt = useCallback(() => {
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = null;
    const element = tiltedLink.current;
    if (element) {
      element.style.setProperty('--hover-rotate-x', '0deg');
      element.style.setProperty('--hover-rotate-y', '0deg');
      element.style.setProperty('--hover-shadow-x', '0px');
      element.style.setProperty('--hover-shadow-y', '0px');
      delete element.dataset.tilting;
    }
    tiltedLink.current = null;
    tiltRect.current = null;
  }, []);

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
  useEffect(() => { resetTilt(); }, [active, reduced, resetTilt]);
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
  }, []);

  function beginTilt(event: PointerEvent<HTMLAnchorElement>, index: number) {
    if (reduced || dragging || index !== active || event.pointerType === 'touch') return;
    if (tiltedLink.current !== event.currentTarget) resetTilt();
    tiltedLink.current = event.currentTarget;
    tiltRect.current = event.currentTarget.getBoundingClientRect();
    event.currentTarget.dataset.tilting = 'true';
  }
  function updateTilt(event: PointerEvent<HTMLAnchorElement>, index: number) {
    if (reduced || dragging || index !== active || event.pointerType === 'touch') return;
    if (tiltedLink.current !== event.currentTarget || !tiltRect.current) beginTilt(event, index);
    const rect = tiltRect.current;
    if (!rect) return;
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
    pendingTilt.current = {
      rotateX: y * -2.5,
      rotateY: x * 3.5,
      shadowX: x * -4,
      shadowY: y * -2,
    };
    if (tiltFrame.current !== null) return;
    const element = event.currentTarget;
    tiltFrame.current = requestAnimationFrame(() => {
      const value = pendingTilt.current;
      element.style.setProperty('--hover-rotate-x', `${value.rotateX}deg`);
      element.style.setProperty('--hover-rotate-y', `${value.rotateY}deg`);
      element.style.setProperty('--hover-shadow-x', `${value.shadowX}px`);
      element.style.setProperty('--hover-shadow-y', `${value.shadowY}px`);
      tiltFrame.current = null;
    });
  }

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
      resetTilt();
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
          const turn = Math.sign(distance) * -(Math.min(depth, 1) * 12 + Math.max(0, Math.min(depth - 1, 1)) * 2);
          // A card crossing the circular seam resets behind the stage instead of flying across the front.
          const crossedSeam = Math.abs(slot - offset(index, previousActive, count)) > 1;
          const style = {
            '--position': distance,
            '--scale': Math.max(0.65, 1 - depth * 0.12),
            '--turn': reduced ? '0deg' : `${turn}deg`,
            '--drop': `${Math.min(depth, 2) * 10}px`,
            '--tilt': reduced ? '0deg' : `${casualTilts[index % casualTilts.length]}deg`,
            '--wander': reduced ? '0px' : `${casualOffsets[index % casualOffsets.length]}px`,
            '--drag-lean': reduced || index !== active ? '0deg' : `${drag * 3.5}deg`,
            '--drag-shadow-x': reduced || index !== active ? '0px' : `${drag * -3}px`,
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
              }}
              onPointerEnter={(event) => beginTilt(event, index)}
              onPointerMove={(event) => updateTilt(event, index)}
              onPointerLeave={() => { if (!dragging) resetTilt(); }}
              onBlur={resetTilt}
              draggable={false}>
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
