'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { resizeSheet, sheetBounds } from '@/utils/sheetGesture';

export default function useTocSheet() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; height: number; moved: boolean } | null>(null);
  const closingRef = useRef(false);
  const height = useRef(0);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destination = useRef<string | null>(null);

  const cancelFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const close = useCallback((id?: string) => {
    if (closingRef.current) return;
    closingRef.current = true;
    destination.current = id ?? null;
    gesture.current = null;
    cancelFrame();
    if (sheet.current) {
      sheet.current.dataset.dragging = 'false';
      sheet.current.style.setProperty('--sheet-offset', '100%');
    }
    setClosing(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closingRef.current = false;
      timer.current = null;
    }, reduced ? 0 : 240);
  }, [cancelFrame]);

  const bounds = useCallback(() => {
    const viewport = overlay.current?.clientHeight ?? window.innerHeight;
    const inset = overlay.current ? parseFloat(getComputedStyle(overlay.current).paddingTop) || 24 : 24;
    return sheetBounds(viewport, inset);
  }, []);

  const paintHeight = useCallback((value: number) => {
    const { min, max } = bounds();
    height.current = Math.max(min, Math.min(max, value));
    sheet.current?.style.setProperty('--sheet-height', `${height.current}px`);
    grip.current?.setAttribute('aria-valuenow', String(Math.round(height.current / max * 100)));
    grip.current?.setAttribute('aria-valuetext', `${Math.round(height.current)} 像素`);
  }, [bounds]);

  const finishDrag = useCallback(() => {
    gesture.current = null;
    cancelFrame();
    if (sheet.current) sheet.current.dataset.dragging = 'false';
  }, [cancelFrame]);

  useEffect(() => () => {
    cancelFrame();
    if (timer.current !== null) clearTimeout(timer.current);
  }, [cancelFrame]);

  useEffect(() => {
    if (!open) return;
    paintHeight(sheet.current?.offsetHeight ?? window.innerHeight * .6);
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const body = document.body;
    const original = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden' });
    sheet.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...(sheet.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[role=separator]') ?? [])]
        .filter(control => !control.closest('[inert]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      Object.assign(body.style, original);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      previousFocus?.focus({ preventScroll: true });
      const id = destination.current;
      destination.current = null;
      const target = id ? document.getElementById(id) : null;
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 100,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };
  }, [open, close, paintHeight]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || closingRef.current || gesture.current) return;
    finishDrag();
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
      height: sheet.current?.offsetHeight ?? height.current, moved: false };
    // Touch browsers may already capture on the child grip. Capture on the
    // stable header immediately; its bubbled lost-capture event is ignored below.
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      if (Math.abs(dx) > Math.abs(dy)) { finishDrag(); return; }
      drag.moved = true;
      if (sheet.current) sheet.current.dataset.dragging = 'true';
    }
    cancelFrame();
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const { min, max } = bounds();
      paintHeight(resizeSheet(drag.height, drag.y, Math.min(event.clientY, drag.y), min, max));
      sheet.current?.style.setProperty('--sheet-offset', String(Math.max(0, dy)) + 'px');
    });
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const down = event.clientY - drag.y;
    if (drag.moved && down >= Math.min(88, drag.height * .22)) {
      close();
      return;
    }
    if (drag.moved) {
      sheet.current?.style.setProperty('--sheet-offset', '0px');
      const { min, max } = bounds();
      paintHeight(resizeSheet(drag.height, drag.y, Math.min(event.clientY, drag.y), min, max));
    }
    finishDrag();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function pointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id === event.pointerId) {
      sheet.current?.style.setProperty('--sheet-offset', '0px');
      finishDrag();
    }
  }

  function resizeKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const { min, max } = bounds();
    const current = sheet.current?.offsetHeight ?? height.current;
    const target = event.key === 'ArrowUp' ? current + 40 : event.key === 'ArrowDown' ? current - 40 :
      event.key === 'Home' ? min : event.key === 'End' ? max : null;
    if (target === null) return;
    event.preventDefault();
    paintHeight(target);
  }

  return { open, closing, sheet, overlay, grip, resizeKey,
    show: () => { destination.current = null; height.current = 0; setOpen(true); },
    close,
    dragHandlers: { onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp,
      onPointerCancel: pointerCancel,
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) pointerCancel(event);
      } },
  };
}
