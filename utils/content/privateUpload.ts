'use client';
import { getBrowserContentMode } from '@/utils/content/browserMode';
export async function uploadPrivateImage(path: string, file: File) {
  try {
    const status = await getBrowserContentMode();
    const response = await fetch(`/api/notes/media?path=${encodeURIComponent(path)}`, {
      method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream',
        'X-Yuria-Preview': status.preview ? '1' : '0', 'X-Yuria-Content-Epoch': status.epoch }, body: file,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const error = new Error(body?.error ?? '图片上传失败');
      window.alert(error.message);
      return { error };
    }
    return { error: null };
  } catch { return { error: new Error('图片上传连接中断') }; }
}
