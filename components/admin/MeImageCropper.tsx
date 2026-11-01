'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { FiMinus, FiPlus, FiRotateCcw } from 'react-icons/fi';
import { createCroppedImage, type CropArea } from '@/utils/me-crop';
import styles from './me-settings.module.css';

export type MeCropHandle = { exportFile: () => Promise<File> };

const MeImageCropper = forwardRef<MeCropHandle, { source: string; round: boolean; defaultRatio: string; onReady: (ready: boolean) => void }>(function MeImageCropper({ source, round, defaultRatio, onReady }, ref) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [ratio, setRatio] = useState(round ? '1' : defaultRatio);
  const [naturalRatio, setNaturalRatio] = useState(1);
  const [failed, setFailed] = useState(false);
  const area = useRef<CropArea | null>(null);
  useImperativeHandle(ref, () => ({ exportFile: async () => {
    if (!area.current) throw new Error('请等待图片加载后再确认');
    return createCroppedImage(source, area.current);
  } }), [source]);
  function reset() { setCrop({ x: 0, y: 0 }); setZoom(1); }

  return <div className={styles.cropEditor}>
    <div className={styles.cropWorkspace}>
      <Cropper image={source} crop={crop} zoom={zoom} minZoom={1} maxZoom={4} aspect={ratio === 'original' ? naturalRatio : Number(ratio)} cropShape={round ? 'round' : 'rect'} showGrid={!round} onCropChange={setCrop} onZoomChange={setZoom} disableAutomaticStylesInjection
        onCropAreaChange={(_, pixels) => { area.current = pixels; onReady(true); }}
        onMediaLoaded={media => setNaturalRatio(media.naturalWidth / media.naturalHeight)}
        mediaProps={{ crossOrigin: 'anonymous', onError: () => { setFailed(true); onReady(false); }, alt: round ? '头像圈选预览' : '图片裁剪预览' }}
        cropperProps={{ 'aria-label': round ? '拖动图片圈选头像，双指或滚轮缩放' : '拖动图片选择裁剪区域，双指或滚轮缩放', tabIndex: 0 }} />
    </div>
    {failed ? <p role="alert" className={styles.cropHint}>无法读取这张图片，请上传原图。</p> : <p className={styles.cropHint}>拖动图片，双指或滚轮缩放；保留框内区域。</p>}
    <div className={styles.cropToolbar}>
      {!round && <select aria-label="裁剪比例" value={ratio} onChange={event => { setRatio(event.target.value); area.current = null; onReady(false); reset(); }}><option value="original">原图比例</option><option value="1">1 : 1</option><option value={4 / 3}>4 : 3</option><option value={3 / 4}>3 : 4</option><option value={16 / 9}>16 : 9</option></select>}
      <div className={styles.cropZoom}><button type="button" aria-label="缩小图片" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .2))}><FiMinus size={17} /></button><output>{Math.round(zoom * 100)}%</output><button type="button" aria-label="放大图片" disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + .2))}><FiPlus size={17} /></button></div>
      <button type="button" aria-label="重置裁剪" title="重置裁剪" onClick={reset}><FiRotateCcw size={17} /></button>
    </div>
  </div>;
});

export default MeImageCropper;
