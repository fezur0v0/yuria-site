'use client';
type Mode = { preview: boolean; r2: boolean; owner: boolean; epoch: string; paused: boolean; live: boolean };
let mode: Promise<Mode> | undefined;
export function getBrowserContentMode() {
  mode ??= fetch('/api/admin/content-preview', { cache: 'no-store' }).then(async response => {
    if (!response.ok) throw new Error('无法确认内容保存位置，请刷新后重试');
    return await response.json() as Mode;
  }).catch(error => { mode = undefined; throw error; });
  return mode;
}
