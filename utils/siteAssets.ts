import manifest from '@/generated/site-assets.json';

type Asset = { key: string; sha256: string; bytes: number; type: string };
export function siteAsset(source: string) {
  const asset = (manifest.files as Record<string, Asset>)[source];
  return asset ? `${manifest.baseUrl}/${asset.key.split('/').map(encodeURIComponent).join('/')}` : source;
}
