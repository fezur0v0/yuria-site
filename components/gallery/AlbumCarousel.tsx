'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import AlbumStackCard, { type GalleryAlbum, type TapeVariant } from './AlbumStackCard';
import { useReducedMotion } from './useReducedMotion';
import styles from './gallery-home.module.css';

const storageKey = 'yuria:gallery:active-album';
const mobileQuery = '(max-width: 639px)';
const casualTilts = [-1.1, 0.7, -0.45, 1.15, -0.75];
const casualOffsets = [-2, 3, 0, -3, 2];
const tapeVariants: TapeVariant[] = ['center', 'none', 'offset'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Gesture = {
  id: number;
  x: number;
  y: number;
  scrollLeft: number;
  moved: boolean;
  vertical: boolean;
};

export default function AlbumCarousel({ albums }: { albums: GalleryAlbum[] }) {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [feedbackIndex, setFeedbackIndex] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const links = useRef(new Map<number, HTMLAnchorElement>());
  const gesture = useRef<Gesture | null>(null);
  const suppressClickUntil = useRef(0);
  const visualFrame = useRef<number | null>(null);
  const tiltFrame = useRef<number | null>(null);
  const tiltedLink = useRef<HTMLAnchorElement | null>(null);
  const tiltRect = useRef<DOMRect | null>(null);
  const pendingTilt = useRef({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const pendingFeedback = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackFrame = useRef<number | null>(null);
  const count = albums.length;

  const remember = useCallback((index: number) => {
    try { sessionStorage.setItem(storageKey, albums[index].id); } catch { /* Storage is optional. */ }
  }, [albums]);

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

  const playFeedback = useCallback((index: number) => {
    pendingFeedback.current = null;
    if (reduced) return;
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    if (feedbackFrame.current !== null) cancelAnimationFrame(feedbackFrame.current);
    setFeedbackIndex(null);
    feedbackFrame.current = requestAnimationFrame(() => {
      feedbackFrame.current = null;
      setFeedbackIndex(index);
      feedbackTimer.current = setTimeout(() => setFeedbackIndex(null), 460);
    });
  }, [reduced]);

  const scheduleSettleFeedback = useCallback(() => {
    if (pendingFeedback.current === null) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const index = pendingFeedback.current;
      if (index !== null) playFeedback(index);
    }, 120);
  }, [playFeedback]);

  const updateVisuals = useCallback(() => {
    visualFrame.current = null;
    const container = stage.current;
    if (!container) return;
    const mobile = window.matchMedia(mobileQuery).matches;
    const containerRect = container.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const readingAnchor = containerRect.left + containerRect.width * 0.22;
    let nextActive = 0;
    let closest = Number.POSITIVE_INFINITY;

    links.current.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const visible = mobile
        ? rect.bottom > 0 && rect.top < window.innerHeight
        : rect.right > containerRect.left && rect.left < containerRect.right;

      if (!reduced && visible) {
        if (mobile) {
          const progress = clamp((centerY - viewportCenter) / (window.innerHeight * 0.62), -1, 1);
          element.style.setProperty('--parallax-x', '0px');
          element.style.setProperty('--parallax-y', `${progress * -7}px`);
        } else {
          const progress = clamp((centerX - (containerRect.left + containerRect.width / 2)) / (containerRect.width * 0.62), -1, 1);
          element.style.setProperty('--parallax-x', `${progress * -14}px`);
          element.style.setProperty('--parallax-y', '0px');
        }
      } else {
        element.style.setProperty('--parallax-x', '0px');
        element.style.setProperty('--parallax-y', '0px');
      }

      const distance = mobile ? Math.abs(centerY - viewportCenter) : Math.abs(centerX - readingAnchor);
      if (visible && distance < closest) {
        closest = distance;
        nextActive = index;
      }
    });

    if (closest !== Number.POSITIVE_INFINITY) {
      if (activeRef.current !== nextActive) {
        activeRef.current = nextActive;
        setActive(nextActive);
        remember(nextActive);
      }
    }
    scheduleSettleFeedback();
  }, [reduced, remember, scheduleSettleFeedback]);

  const scheduleVisualUpdate = useCallback(() => {
    if (visualFrame.current !== null) return;
    visualFrame.current = requestAnimationFrame(updateVisuals);
  }, [updateVisuals]);

  const scrollToAlbum = useCallback((
    index: number,
    feedback = false,
    focus = false,
    behaviorOverride?: ScrollBehavior,
  ) => {
    const target = links.current.get(index);
    const container = stage.current;
    if (!target || !container) return;
    activeRef.current = index;
    setActive(index);
    remember(index);
    if (feedback) pendingFeedback.current = index;
    if (focus) target.focus({ preventScroll: true });

    const behavior: ScrollBehavior = behaviorOverride ?? (reduced ? 'auto' : 'smooth');
    if (window.matchMedia(mobileQuery).matches) {
      target.scrollIntoView({ behavior, block: 'center' });
    } else {
      const padding = Number.parseFloat(getComputedStyle(container).paddingLeft) || 0;
      const maximum = container.scrollWidth - container.clientWidth;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetLeft = container.scrollLeft + targetRect.left - containerRect.left - padding;
      container.scrollTo({ left: clamp(targetLeft, 0, maximum), behavior });
    }
    if (feedback) scheduleSettleFeedback();
  }, [reduced, remember, scheduleSettleFeedback]);

  useEffect(() => {
    const container = stage.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (window.matchMedia(mobileQuery).matches || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const maximum = container.scrollWidth - container.clientWidth;
      if (maximum <= 0) return;
      const next = clamp(container.scrollLeft + event.deltaY, 0, maximum);
      if (next === container.scrollLeft) return;
      event.preventDefault();
      container.scrollLeft = next;
    };
    const handleScroll = () => scheduleVisualUpdate();
    const handleWindowScroll = () => {
      if (window.matchMedia(mobileQuery).matches) scheduleVisualUpdate();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('resize', scheduleVisualUpdate, { passive: true });

    const restoreTimer = setTimeout(() => {
      let savedIndex = -1;
      try {
        const saved = sessionStorage.getItem(storageKey);
        savedIndex = albums.findIndex((album) => album.id === saved);
      } catch { /* Storage is optional. */ }
      if (savedIndex >= 0) scrollToAlbum(savedIndex, false, false, 'auto');
      scheduleVisualUpdate();
    }, 80);

    return () => {
      clearTimeout(restoreTimer);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', scheduleVisualUpdate);
    };
  }, [albums, scheduleVisualUpdate, scrollToAlbum]);

  useEffect(() => () => {
    if (visualFrame.current !== null) cancelAnimationFrame(visualFrame.current);
    if (tiltFrame.current !== null) cancelAnimationFrame(tiltFrame.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    if (feedbackFrame.current !== null) cancelAnimationFrame(feedbackFrame.current);
  }, []);

  useEffect(() => {
    if (reduced) resetTilt();
    scheduleVisualUpdate();
  }, [reduced, resetTilt, scheduleVisualUpdate]);

  function beginTilt(event: PointerEvent<HTMLAnchorElement>) {
    if (reduced || dragging || event.pointerType === 'touch') return;
    if (tiltedLink.current !== event.currentTarget) resetTilt();
    tiltedLink.current = event.currentTarget;
    tiltRect.current = event.currentTarget.getBoundingClientRect();
    event.currentTarget.dataset.tilting = 'true';
  }

  function updateTilt(event: PointerEvent<HTMLAnchorElement>) {
    if (reduced || dragging || event.pointerType === 'touch') return;
    if (tiltedLink.current !== event.currentTarget || !tiltRect.current) beginTilt(event);
    const rect = tiltRect.current;
    if (!rect) return;
    const x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
    const y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
    pendingTilt.current = { rotateX: y * -2.5, rotateY: x * 3.5, shadowX: x * -4, shadowY: y * -2 };
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

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia(mobileQuery).matches || count < 2 || !event.isPrimary || event.button !== 0 || gesture.current) return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
      vertical: false,
    };
    suppressClickUntil.current = 0;
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || current.vertical) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved) {
      if (Math.abs(dy) > 7 && Math.abs(dy) > Math.abs(dx)) { current.vertical = true; return; }
      if (Math.abs(dx) < 7) return;
      current.moved = true;
      resetTilt();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    event.currentTarget.scrollLeft = current.scrollLeft - dx;
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    if (current.moved) suppressClickUntil.current = performance.now() + 450;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const mobile = window.matchMedia(mobileQuery).matches;
    const previousKey = mobile ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = mobile ? 'ArrowDown' : 'ArrowRight';
    const next = event.key === previousKey ? Math.max(0, active - 1)
      : event.key === nextKey ? Math.min(count - 1, active + 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? count - 1
            : null;
    if (next === null) return;
    event.preventDefault();
    scrollToAlbum(next, true, true);
  }

  return (
    <section className={styles.carousel} aria-label="选择相册" onKeyDown={handleKeyboard}>
      <div
        className={styles.stage}
        ref={stage}
        data-dragging={dragging}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onClickCapture={(event) => {
          if (performance.now() < suppressClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {albums.map((album, index) => {
          const style = {
            '--casual-tilt': reduced ? '0deg' : `${casualTilts[index % casualTilts.length]}deg`,
            '--casual-offset': reduced ? '0px' : `${casualOffsets[index % casualOffsets.length]}px`,
          } as CSSProperties;
          return (
            <Link
              key={album.id}
              href={`/gallery/${album.id}`}
              prefetch={false}
              ref={(element) => { if (element) links.current.set(index, element); else links.current.delete(index); }}
              className={styles.slide}
              style={style}
              aria-label={`打开相册：${album.title}`}
              onClick={() => remember(index)}
              onPointerEnter={beginTilt}
              onPointerMove={updateTilt}
              onPointerLeave={() => { if (!dragging) resetTilt(); }}
              onBlur={resetTilt}
              draggable={false}
            >
              <div className={styles.feedbackLayer} data-feedback={feedbackIndex === index}>
                <AlbumStackCard album={album} priority={index < 3} tape={tapeVariants[index % tapeVariants.length]} />
              </div>
            </Link>
          );
        })}
      </div>

      {count > 1 ? (
        <nav className={styles.rail} aria-label="相册快速导航">
          {albums.map((album, index) => (
            <button
              key={album.id}
              type="button"
              className={styles.railButton}
              aria-label={`滚动到相册：${album.title}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => scrollToAlbum(index, true)}
            >
              <span className={styles.tick} aria-hidden="true" />
            </button>
          ))}
        </nav>
      ) : null}
      <p className={styles.srOnly} aria-live="polite" aria-atomic="true">当前相册：{albums[active].title}</p>
    </section>
  );
}
