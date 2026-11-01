export type CropArea = { x: number; y: number; width: number; height: number };

export function cropBounds(area: CropArea, width: number, height: number) {
  if (![area.x, area.y, area.width, area.height, width, height].every(Number.isFinite) || width <= 0 || height <= 0 || area.width <= 0 || area.height <= 0) throw new Error('请先选择裁剪区域');
  const x = Math.max(0, Math.min(Math.round(area.x), width - 1));
  const y = Math.max(0, Math.min(Math.round(area.y), height - 1));
  const cropWidth = Math.max(1, Math.min(Math.round(area.width), width - x));
  const cropHeight = Math.max(1, Math.min(Math.round(area.height), height - y));
  const scale = Math.min(1, 1600 / Math.max(cropWidth, cropHeight));
  return { x, y, width: cropWidth, height: cropHeight, outputWidth: Math.max(1, Math.round(cropWidth * scale)), outputHeight: Math.max(1, Math.round(cropHeight * scale)) };
}

export async function createCroppedImage(source: string, area: CropArea): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img); img.onerror = () => reject(new Error('无法读取这张图片，请上传原图后裁剪。')); img.src = source;
  });
  const crop = cropBounds(area, image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas'); canvas.width = crop.outputWidth; canvas.height = crop.outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('暂时无法处理图片，请重试');
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    try { canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片处理未完成，请重试')), 'image/webp', .94); }
    catch { reject(new Error('这张图片不允许直接裁剪，请上传原图后重试。')); }
  });
  return new File([blob], `me-crop-${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'png'}`, { type: blob.type });
}

// Read only public media from our configured bucket, never arbitrary remote URLs.
export function cropSourceKey(source: string, publicBase: string): string | null {
  try {
    const url = new URL(source); const base = new URL(publicBase.replace(/\/$/, '') + '/');
    if (url.protocol !== 'https:' || url.origin !== base.origin || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(base.pathname)) return null;
    const key = decodeURIComponent(url.pathname.slice(base.pathname.length));
    if (key.length > 2048 || !/^[a-zA-Z0-9/_ .-]+$/.test(key) || key.includes('..') || !/^(?:migration-preview\/)?(?:gallery\/|portfolio\/(?:content|covers)\/|site-assets\/)/.test(key)) return null;
    return key;
  } catch { return null; }
}
