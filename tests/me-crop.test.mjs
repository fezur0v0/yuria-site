import test from 'node:test';
import assert from 'node:assert/strict';
import { cropBounds, cropSourceKey } from '../utils/me-crop.ts';

test('a selected image region exports only that region and keeps its aspect ratio', () => {
  assert.deepEqual(cropBounds({ x: 120, y: 200, width: 400, height: 300 }, 1200, 1600), { x: 120, y: 200, width: 400, height: 300, outputWidth: 400, outputHeight: 300 });
  const large = cropBounds({ x: 0, y: 0, width: 4000, height: 3000 }, 4000, 3000);
  assert.equal(large.outputWidth, 1600); assert.equal(large.outputHeight, 1200);
  assert.deepEqual(cropBounds({ x: 95, y: 96, width: 20, height: 20 }, 100, 100), { x: 95, y: 96, width: 5, height: 4, outputWidth: 5, outputHeight: 4 });
  assert.throws(() => cropBounds({ x: 0, y: 0, width: 0, height: 1 }, 100, 100));
  assert.throws(() => cropBounds({ x: NaN, y: 0, width: 10, height: 10 }, 100, 100));
});

test('crop source access is restricted to media in the configured public bucket', () => {
  const base = 'https://images.example/public';
  assert.equal(cropSourceKey(`${base}/portfolio/content/photo.webp`, base), 'portfolio/content/photo.webp');
  assert.equal(cropSourceKey(`${base}/site-assets/me/avatar.webp`, base), 'site-assets/me/avatar.webp');
  assert.equal(cropSourceKey(`${base}/gallery/album/photo.png`, base), 'gallery/album/photo.png');
  for (const source of [
    'https://other.example/public/portfolio/content/a.webp',
    'https://images.example/publicity/portfolio/content/a.webp',
    `${base}/content/live/current.json`,
    `${base}/portfolio/content/%2e%2e%2fprivate.png`,
    `${base}/portfolio/content/a.png?token=secret`,
    `${base}/portfolio/content/a.png#x`,
    'https://user:password@images.example/public/portfolio/content/a.png',
    'http://images.example/public/portfolio/content/a.png',
  ]) assert.equal(cropSourceKey(source, base), null, source);
});
