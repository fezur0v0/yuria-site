'use client';
import { useEffect, useState } from 'react';

type Status = { rows: number; files: number; passwords: number; complete: boolean };
async function readStatus(): Promise<Status> {
  const response = await fetch('/api/admin/supabase-cleanup', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '待清理清单读取失败');
  return data;
}
export default function SupabaseCleanup() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void readStatus().then(data => { if (active) setStatus(data); })
      .catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, []);
  async function cleanup() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/supabase-cleanup', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanup' }) });
      const data = await response.json();
      if (!response.ok || !data.complete) throw new Error(data.error ?? '清理未确认完成');
    } catch (error) { setError(error instanceof Error ? error.message : '连接中断，请刷新检查剩余数量'); }
    finally {
      try { setStatus(await readStatus()); } catch { setError(value => value || '清单读取失败，请刷新页面'); }
      setBusy(false);
    }
  }
  return <section className="space-y-4 rounded-2xl border border-black/15 bg-white/70 p-5 sm:p-7">
    <h2 className="text-xl">清理 Supabase 旧副本</h2>
    <p className="text-sm leading-7">校验正式 R2 备份与全部原图片后，删除 Supabase 的旧内容、图床文件和旧密码配置。
      登录账号、GitHub／Google 绑定、系统表、业务表结构及 R2 正式内容和备份都会保留。</p>
    <p className="text-sm leading-7">请暂停在 Supabase 中直接修改旧数据，并保持页面打开。中断后可检查剩余数量并重试。</p>
    <button type="button" disabled={busy || !status || status.complete} onClick={() => void cleanup()}
      className="rounded-lg bg-black px-4 py-3 text-sm text-white disabled:opacity-40">清理 Supabase 旧副本</button>
    <div role="status" aria-live="polite" className="space-y-2 text-sm leading-7">
      {status && <p>待清理：旧内容 {status.rows} 条，图片 {status.files} 个，旧密码配置 {status.passwords} 条。</p>}
      {busy && <p>正在逐个校验备份并清理，可能需要几分钟。请保持页面打开。</p>}
      {status?.complete && <p className="font-medium">Supabase 旧副本已清理完成，网站继续使用 R2；登录资料保留。</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  </section>;
}
