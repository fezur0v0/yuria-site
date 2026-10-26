'use client';

import { useState } from 'react';
import Link from 'next/link';

type Result = { error?: string; ready?: boolean; complete?: boolean; bucket?: string;
  prefix?: string; counts?: Record<string, number>; files?: number; bytes?: number };
type ContentCheck = { verified?: boolean; error?: string; counts?: Record<string, { owner: number; guest: number }> };
const TABLE_LABELS: Record<string, string> = {
  site_config: '网站基础设置', site_settings: '网站资料', hero_lines: '首页文案', intro_lines: '开场文案',
  music_tracks: '音乐列表', portfolio_items: '随笔', gallery_albums: '图册', gallery_images: '图册照片记录',
  theater_cards: '小剧场卡片', theater_records: '小剧场记录', characters: '角色资料',
};

export default function StorageBackup() {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [contentCheck, setContentCheck] = useState<ContentCheck | null>(null);
  async function checkContent() {
    setBusy(true);
    setContentCheck(null);
    try {
      const response = await fetch('/api/admin/storage-content-check', { cache: 'no-store' });
      setContentCheck(await response.json());
    } catch { setContentCheck({ error: '内容校验连接中断，请稍后重试。' }); }
    finally { setBusy(false); }
  }
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
    <section className="space-y-4 border-t border-black/10 pt-6">
      <h2 className="text-lg">下一阶段 · R2 内容读取校验</h2>
      <p className="text-sm leading-7">读取已指定的 R2 备份，核对完整性，并分别计算站长与访客可见的记录数。
        本检查不写入内容，也不切换网站来源。</p>
      <button type="button" disabled={busy} onClick={() => void checkContent()}
        className="rounded-lg border border-black/20 px-4 py-3 text-sm disabled:opacity-40">校验 R2 内容读取</button>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {contentCheck?.error && <p>{contentCheck.error}</p>}
        {contentCheck?.verified && <>
          <p>R2 备份读取与完整性校验通过。以下仅为数据层访问规则的检查，编辑和页面切换尚未完成。</p>
          <div className="overflow-x-auto"><table className="w-full text-left">
            <thead><tr><th scope="col">内容</th><th scope="col">站长可见</th><th scope="col">访客可见</th></tr></thead>
            <tbody>{Object.entries(contentCheck.counts ?? {}).map(([name, counts]) =>
              <tr key={name}><th scope="row" className="font-normal">{TABLE_LABELS[name] ?? name}</th><td>{counts.owner}</td><td>{counts.guest}</td></tr>)}</tbody>
          </table></div>
        </>}
      </div>
    </section>
    <div role="status" aria-live="polite" className="break-words text-sm leading-7">
      {busy && <p>处理中，请保持页面打开。完整备份可能需要几分钟。</p>}
      {result?.error && <p>{result.error}</p>}
      {result?.ready && <p>已连接私有桶 {result.bucket}。可以开始复制。</p>}
      {result?.complete && <div className="space-y-3">
        <p>复制与校验完成。Supabase 图片：{result.files} 个；数据及图片约 {((result.bytes ?? 0) / 1024 / 1024).toFixed(2)} MiB。</p>
        <p>私有桶目录：<code>{result.prefix}</code></p>
        <ul>{Object.entries(result.counts ?? {}).map(([name, count]) => <li key={name}>{TABLE_LABELS[name] ?? name}：{count} 条</li>)}</ul>
        <p>网站仍使用原数据。接下来需要改造读写接口和验证权限，才能正式切换。</p>
      </div>}
    </div>
  </section>;
}
