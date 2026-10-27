import 'server-only';
import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { get } from 'node:https';
import { publicAddress } from './imageNetwork.ts';

export async function downloadImage(source: string, redirects = 0, deadline = Date.now() + 18000): Promise<Uint8Array> {
  const url = new URL(source.replaceAll('&amp;', '&'));
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' || redirects > 3) {
    throw new Error('图片地址或跳转不受支持，原地址已保留');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (Date.now() >= deadline) throw new Error('图片下载超时，原地址已保留');
  const addresses = await new Promise<LookupAddress[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('图片地址解析超时，原地址已保留')), Math.min(5000, deadline - Date.now()));
    lookup(host, { all: true }).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
  if (!addresses.length || addresses.some(entry => !publicAddress(entry.address))) throw new Error('图片地址不能用于迁移');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => request.destroy(new Error('图片下载超时，原地址已保留')), Math.max(1, deadline - Date.now()));
    const request = get(url, {
      headers: { Accept: 'image/*', 'User-Agent': 'Yuria-Image-Migration/1.0' },
      // Pin the checked DNS result, including when following redirects.
      lookup(_hostname, options, callback) {
        if (typeof options === 'object' && options?.all) callback(null, addresses);
        else callback(null, addresses[0].address, addresses[0].family);
      },
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) {
        response.resume(); clearTimeout(timer);
        void downloadImage(new URL(response.headers.location, url).href, redirects + 1, deadline).then(resolve, reject); return;
      }
      if (response.statusCode !== 200 || !response.headers['content-type']?.toLowerCase().startsWith('image/')) {
        response.resume(); clearTimeout(timer); reject(new Error('图床未返回可下载图片，原地址已保留')); return;
      }
      const parts: Buffer[] = []; let length = 0;
      response.on('data', chunk => {
        length += chunk.length;
        if (length > 20 * 1024 * 1024) request.destroy(new Error('图片超过 20 MB，需单独处理'));
        else parts.push(chunk);
      });
      response.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(parts)); });
      response.on('error', error => { clearTimeout(timer); reject(error); });
    });
    request.on('error', error => { clearTimeout(timer); reject(error); });
  });
}
