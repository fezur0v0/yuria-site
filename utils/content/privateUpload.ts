'use client';
import { createClient } from '@/utils/supabase/client';
import { getBrowserContentMode } from '@/utils/content/browserMode';
export async function uploadPrivateImage(path: string, file: File) {
  try {
    const status = await getBrowserContentMode();
    if (!status.r2) return createClient().storage.from('theater-images').upload(path, file);
    const response = await fetch(`/api/notes/media?path=${encodeURIComponent(path)}`, {
      method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream',
        'X-Yuria-Preview': status.preview ? '1' : '0' }, body: file,
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
