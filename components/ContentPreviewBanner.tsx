'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserContentMode } from '@/utils/content/browserMode';

export default function ContentPreviewBanner() {
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void getBrowserContentMode().then(data => { if (active) setPreview(data.preview === true); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!preview) return null;
  async function exit() {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/content-preview', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disable' }) });
      if (response.ok) window.location.reload();
      else { window.alert('退出预览未完成，请重试'); setBusy(false); }
    } catch { setBusy(false); window.alert('连接中断，请重试'); }
  }
  return <aside aria-label="内容预览状态" className="fixed bottom-4 right-4 z-[100] max-w-[calc(100vw-32px)] rounded-xl bg-black/90 p-4 text-xs leading-6 text-white shadow-xl backdrop-blur-xl">
    <p>R2 预览中 · 修改仅保存到测试副本</p>
    <div className="flex gap-5"><Link href="/admin/storage" className="underline">迁移管理</Link>
      <button type="button" disabled={busy} onClick={() => void exit()} className="underline disabled:opacity-50">退出预览</button></div>
  </aside>;
}
