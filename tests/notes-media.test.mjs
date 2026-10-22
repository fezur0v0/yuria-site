import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidTheaterObjectPath, privateTheaterMediaUrl, theaterMediaUrl } from '../utils/notes/media.ts';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

test('legacy public images use the authenticated endpoint', () => {
  assert.equal(
    privateTheaterMediaUrl('https://example.supabase.co/storage/v1/object/public/theater-images/char-123.png'),
    '/api/notes/media?path=char-123.png',
  );
});

test('old signed URLs lose their expiring token when converted', () => {
  assert.equal(
    privateTheaterMediaUrl('https://example.supabase.co/storage/v1/object/sign/theater-images/123.png?token=expired'),
    '/api/notes/media?path=123.png',
  );
});

test('public gallery images and external hosts are preserved', () => {
  for (const url of [
    'https://example.supabase.co/storage/v1/object/public/gallery/123.png',
    'https://other.supabase.co/storage/v1/object/public/theater-images/123.png',
    'https://example.supabase.co.evil.invalid/storage/v1/object/public/theater-images/123.png',
    '/api/notes/media?path=123.png',
  ]) assert.equal(privateTheaterMediaUrl(url), url);
});

test('traversal, encoded traversal, empty segments and control characters are rejected', () => {
  for (const path of ['', '../a.png', 'a/../b.png', '/a.png', 'a//b.png', 'a\\b.png', 'a/%2e%2e/b.png', 'a\u0000.png']) {
    assert.equal(isValidTheaterObjectPath(path), false, path);
    assert.throws(() => theaterMediaUrl(path));
  }
});

test('nested and Unicode object keys are safely encoded', () => {
  assert.equal(theaterMediaUrl('folder/图片.png'), '/api/notes/media?path=folder%2F%E5%9B%BE%E7%89%87.png');
});

test('malformed object encoding is rejected without throwing', () => {
  assert.equal(privateTheaterMediaUrl('https://example.supabase.co/storage/v1/object/public/theater-images/%252e%252e/file.png'), '');
});
