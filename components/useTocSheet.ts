'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { sheetVelocity, shouldDismissSheet, type DragSample } from '@/utils/sheetGesture';

export default function useTocSheet() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean; samples: DragSample[] } | null>(null);
  const suppressClick = useRef(false);
  const closingRef = useRef(false);
  const offset = useRef(0);
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

  const resetDrag = useCallback(() => {
    gesture.current = null;
    cancelFrame();
    offset.current = 0;
    if (sheet.current) {
      sheet.current.dataset.dragging = 'false';
      sheet.current.style.setProperty('--sheet-offset', '0px');
    }
    overlay.current?.style.setProperty('--sheet-shade', '.25');
  }, [cancelFrame]);

  useEffect(() => () => {
    cancelFrame();
    if (timer.current !== null) clearTimeout(timer.current);
  }, [cancelFrame]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    const body = document.body;
    const original = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden' });
    sheet.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...(sheet.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]') ?? [])]
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
  }, [open, close]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || closingRef.current || gesture.current) return;
    resetDrag();
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
      samples: [{ y: event.clientY, time: event.timeStamp }] };
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      suppressClick.current = true;
      if (Math.abs(dx) > Math.abs(dy)) { resetDrag(); return; }
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      if (sheet.current) sheet.current.dataset.dragging = 'true';
    }
    drag.samples = [...drag.samples.filter(sample => event.timeStamp - sample.time <= 100), { y: event.clientY, time: event.timeStamp }];
    offset.current = Math.max(0, dy);
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      sheet.current?.style.setProperty('--sheet-offset', `${offset.current}px`);
      const height = sheet.current?.offsetHeight ?? 1;
      overlay.current?.style.setProperty('--sheet-shade', String(.25 * Math.max(0, 1 - offset.current / height)));
    });
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const distance = Math.max(0, event.clientY - drag.y);
    const samples = [...drag.samples, { y: event.clientY, time: event.timeStamp }];
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved && shouldDismissSheet(distance, sheet.current?.offsetHeight ?? 400, sheetVelocity(samples, event.timeStamp))) close();
    else resetDrag();
  }

  function pointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    suppressClick.current = true;
    resetDrag();
  }

  return { open, closing, sheet, overlay,
    show: () => { destination.current = null; suppressClick.current = false; offset.current = 0; setOpen(true); },
    close,
    gripClick: () => { if (!suppressClick.current) close(); },
    dragHandlers: { onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp,
      onPointerCancel: pointerCancel, onLostPointerCapture: pointerCancel },
  };
}
