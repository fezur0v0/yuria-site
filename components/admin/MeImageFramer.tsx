'use client';

import { useRef, useState } from 'react';
import { FiImage, FiRotateCcw } from 'react-icons/fi';
import { defaultMeImageFrame, meFrameStyle, type MeImageFrame } from '@/components/me/content';
import { siteAsset } from '@/utils/siteAssets';
import styles from './me-settings.module.css';

export default function MeImageFramer({ source, label, frame, onChange, shape = 'square', disabled = false }: {
  source: string; label: string; frame?: MeImageFrame; onChange: (frame: MeImageFrame) => void;
  shape?: 'square' | 'circle' | 'portrait' | 'background'; disabled?: boolean;
}) {
  const value = frame ?? defaultMeImageFrame;
  const drag = useRef<{ id: number; x: number; y: number; frame: MeImageFrame } | null>(null);
  const [failed, setFailed] = useState(false);
  const safe = /^https:\/\//i.test(source) || /^\/(?!\/)/.test(source);
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  return <div className={styles.framer}>
    <div className={styles.cropPreview} data-shape={shape} onPointerDown={event => {
      if (disabled || !safe || failed || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, frame: value };
    }} onPointerMove={event => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      const rect = event.currentTarget.getBoundingClientRect();
      onChange({ ...start.frame, x: clamp(start.frame.x - (event.clientX - start.x) * 2 / rect.width), y: clamp(start.frame.y - (event.clientY - start.y) * 2 / rect.height) });
    }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      {safe && !failed ? <img src={siteAsset(source)} alt={`${label}显示区域预览`} draggable={false} style={{ ...meFrameStyle(value), objectFit: shape === 'portrait' ? 'contain' : 'cover' }} onError={() => setFailed(true)} /> : <FiImage size={30} aria-hidden="true" />}
    </div>
    {failed && <p role="alert" className={styles.help}>无法预览，请检查图片地址。</p>}
    {safe && !failed && <div className={styles.cropControls}>
      <label>缩放 <output>{Math.round(value.zoom * 100)}%</output><input aria-label="图片缩放" type="range" min="1" max="3" step="0.01" value={value.zoom} disabled={disabled} onChange={event => onChange({ ...value, zoom: Number(event.target.value) })} /></label>
      <label>水平位置<input aria-label="图片水平位置" type="range" min="-1" max="1" step="0.01" value={value.x} disabled={disabled} onChange={event => onChange({ ...value, x: Number(event.target.value) })} /></label>
      <label>垂直位置<input aria-label="图片垂直位置" type="range" min="-1" max="1" step="0.01" value={value.y} disabled={disabled} onChange={event => onChange({ ...value, y: Number(event.target.value) })} /></label>
      <button type="button" disabled={disabled} onClick={() => onChange({ ...defaultMeImageFrame })}><FiRotateCcw size={14} aria-hidden="true" />重置区域</button>
    </div>}
  </div>;
}
