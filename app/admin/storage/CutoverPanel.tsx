'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CutoverState } from '@/utils/migration/cutover';

const LABELS: Record<string, string> = {
  site_config: '网站基础设置', site_settings: '网站资料', hero_lines: '首页文案', intro_lines: '开场文案',
  music_tracks: '音乐列表', portfolio_items: '随笔', gallery_albums: '图册', gallery_images: '图册照片记录',
  theater_cards: '小剧场卡片', theater_records: '小剧场记录', characters: '角色资料',
};
export default function CutoverPanel() {
  const [state, setState] = useState<CutoverState | null>(null);
  const [recoverable, setRecoverable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/storage-cutover', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? '状态读取失败');
      setState(data.state);
      setRecoverable(data.recoverable === true);
      return data.state as CutoverState;
    } catch {
      setError('暂时无法确认迁移状态，请稍后点击“刷新迁移状态”。');
      return null;
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!busy && state?.phase !== 'preparing') return;
    const timer = setInterval(() => { void refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [busy, state?.phase, refresh]);
  async function execute(action: 'activate-fresh' | 'recover') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/storage-cutover', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (data.state) setState(data.state);
      if (!response.ok) setError(data.error ?? '操作未完成，请刷新迁移状态');
    } catch { setError('连接中断，完成状态待确认。请刷新迁移状态，不要重复点击切换。'); }
    finally { await refresh(); setBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-black/15 bg-white/70 p-5 sm:p-7">
    <h2 className="text-xl">正式切换到 R2</h2>
    {state?.phase !== 'active' && <>
      <p className="text-sm leading-7">使用原网站的最新随笔、图册、小剧场、角色和设置重新备份，逐个校验后，统一切换读取与保存。
        预览中的测试修改和新增图片保留在测试副本，不合并到正式内容。Supabase 登录继续使用。</p>
      <p className="text-sm leading-7">请先停止其他页面的编辑和上传。执行时会暂时暂停保存，可能需要几分钟；
        请保持此页打开。原数据库和原图片均保留。</p>
    </>}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || state?.phase !== 'idle'} onClick={() => void execute('activate-fresh')}
        className="rounded-lg bg-black px-4 py-3 text-sm text-white disabled:opacity-40">以原网站最新内容正式切换</button>
      <button type="button" onClick={() => { setError(''); void refresh(); }}
        className="rounded-lg border border-black/20 px-4 py-3 text-sm">刷新迁移状态</button>
      {recoverable && <button type="button" disabled={busy} onClick={() => void execute('recover')}
        className="rounded-lg border border-black/20 px-4 py-3 text-sm disabled:opacity-40">解除中断的迁移暂停</button>}
    </div>
    <div role="status" aria-live="polite" className="space-y-2 break-words text-sm leading-7">
      {busy && <p>正在备份、校验并切换，请不要在其他页面编辑或上传。</p>}
      {!busy && state?.phase === 'idle' && <p>尚未切换。当前正式网站仍使用原内容来源。</p>}
      {state?.phase === 'preparing' && <p>迁移正在进行，访客仍可浏览原内容，保存暂时暂停。状态会自动刷新。</p>}
      {error && <p role="alert">{error}</p>}
      {state?.phase === 'active' && <>
        <p className="font-medium">已正式切换到 R2，新的内容修改会保存到正式 R2 内容库。</p>
        <p>原网站最新内容已完成备份及校验，共 {state.files} 个 Supabase 图片文件；测试副本单独保留。</p>
        <ul>{Object.entries(state.counts).map(([name, count]) => <li key={name}>{LABELS[name] ?? name}：{count} 条</li>)}</ul>
        <p>请刷新其他已打开的编辑页面，再继续编辑。</p>
        <a href="/" className="inline-block underline underline-offset-4">打开正式网站</a>
      </>}
    </div>
  </section>;
}
