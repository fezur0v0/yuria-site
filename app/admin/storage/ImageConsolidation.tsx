'use client';
import { useCallback, useEffect, useState } from 'react';

type Failure = { id: string; host: string; reason: string };
type Status = { remaining: number; public: number; private: number; hosts: string[] };
export default function ImageConsolidation() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [error, setError] = useState('');
  const check = useCallback(async () => {
    const response = await fetch('/api/admin/image-consolidation', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? '检查未完成'); return; }
    setStatus(data);
  }, []);
  useEffect(() => { void check().catch(() => setError('图片清单读取失败，请刷新后重试')); }, [check]);
  async function migrate() {
    setBusy(true); setError(''); setFailures([]); setUpdated(0);
    const skipped: string[] = [];
    try {
      for (let batch = 0; batch < 50; batch++) {
        const response = await fetch('/api/admin/image-consolidation', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'consolidate', skip: skipped }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? '图片迁移未完成');
        setUpdated(value => value + data.updated);
        const issues: Failure[] = data.failures ?? [];
        skipped.push(...issues.map(issue => issue.id));
        setFailures(value => [...value, ...issues]);
        if (!data.more) break;
      }
      await check();
    } catch (error) { setError(error instanceof Error ? error.message : '连接中断，请刷新检查完成状态'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-black/15 bg-white/70 p-5 sm:p-7">
    <h2 className="text-xl">统一内容中的图片</h2>
    <p className="text-sm leading-7">网站自带图片已随部署复制并校验到 R2。这里继续处理正式内容中引用的外部图片和旧图片地址。
      公开图片放公开桶，私人图片放私有桶；音乐播放链接保留。复制校验成功后才更新引用，下载失败的图片保留原地址。</p>
    <p className="text-sm leading-7">执行期间请暂停其他页面的编辑和上传，并保持页面打开。大量图片会自动分批处理。</p>
    <button type="button" disabled={busy || !status || status.remaining === 0} onClick={() => void migrate()}
      className="rounded-lg bg-black px-4 py-3 text-sm text-white disabled:opacity-40">统一图片到 R2</button>
    <div role="status" aria-live="polite" className="space-y-2 break-words text-sm leading-7">
      {status && <p>待统一：{status.remaining} 个图片地址（公开 {status.public} 个，私人 {status.private} 个）。</p>}
      {busy && <p>正在复制、校验并更新图片引用，请保持页面打开。</p>}
      {updated > 0 && <p>本次已更新 {updated} 个图片地址。</p>}
      {status?.remaining === 0 && <p className="font-medium">正式内容中的图片地址已全部归并到 R2。</p>}
      {error && <p role="alert">{error}</p>}
      {failures.map(failure => <p key={failure.id}>{failure.host}：{failure.reason}</p>)}
    </div>
  </section>;
}
