'use client';

import { useState } from 'react';
import Link from 'next/link';

type Result = { error?: string; ready?: boolean; complete?: boolean; bucket?: string;
  prefix?: string; counts?: Record<string, number>; files?: number; bytes?: number };

export default function StorageBackup() {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  async function run(backup: boolean) {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/storage-backup', backup ? {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' }),
      } : { cache: 'no-store' });
      const data: Result = await response.json();
      setResult(data);
      if (!backup) setReady(response.ok && data.ready === true);
    } catch {
      setResult({ error: '连接中断，完成状态未知。请到私有桶检查本次目录的 manifest.json；原数据不会被删除。' });
    } finally { setBusy(false); }
  }
  return <section className="space-y-6 text-black/80">
    <Link href="/admin" className="text-sm underline underline-offset-4">返回管理面板</Link>
    <h1 className="text-2xl">内容迁移 · 复制备份</h1>
    <p className="text-sm leading-7">先复制网站业务表和 Supabase 图片到私有 R2，并逐个读取副本校验。
      本步骤保留原数据和全部图片链接，不切换网站来源。登录账号及旧密码配置不在导出范围内。</p>
    <p className="text-sm leading-7">运行期间请暂停其他页面的内容编辑和图片上传，让备份中的记录与图片对应。
      这一步只覆盖 Supabase 中的内容，网站自带文件和外部图床将在后续分别核对。</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => void run(false)}
        className="rounded-lg border border-black/20 px-4 py-3 text-sm disabled:opacity-40">检查私有桶连接</button>
      <button type="button" disabled={busy || !ready} onClick={() => void run(true)}
        className="rounded-lg bg-black px-4 py-3 text-sm text-white disabled:opacity-40">复制并校验备份</button>
    </div>
    <div role="status" aria-live="polite" className="break-words text-sm leading-7">
      {busy && <p>处理中，请保持页面打开。图片会逐个复制并核对，可能需要几分钟。</p>}
      {result?.error && <p>{result.error}</p>}
      {result?.ready && <p>已连接私有桶 {result.bucket}。可以开始复制。</p>}
      {result?.complete && <div className="space-y-3">
        <p>复制与校验完成。Supabase 图片：{result.files} 个；数据及图片约 {((result.bytes ?? 0) / 1024 / 1024).toFixed(2)} MiB。</p>
        <p>私有桶目录：<code>{result.prefix}</code></p>
        <ul>{Object.entries(result.counts ?? {}).map(([name, count]) => <li key={name}>{name}：{count} 条</li>)}</ul>
        <p>网站仍使用原数据。接下来需要改造读写接口和验证权限，才能正式切换。</p>
      </div>}
    </div>
  </section>;
}
