import test from 'node:test';
import assert from 'node:assert/strict';
import { addMeTag, defaultMeContent, meFrameStyle, meMoments, mePhotoSlots, moveMePhoto, parseMeContent, ME_CONFIG_KEY } from '../components/me/content.ts';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { queryContent, mutateContent } from '../utils/migration/query.ts';

test('editor content round trips through R2 settings and is visible to visitors without exposing private settings', () => {
  const doc = { version: 1, tables: Object.fromEntries(CONTENT_TABLES.map(name => [name, []])) };
  doc.tables.site_config = [{ key: 'private_setting', value: 'private' }];
  const content = structuredClone(defaultMeContent);
  content.profile.name = 'Changed name';
  content.topics.push({ id: 'new-topic', label: '新的话题', pages: [['第一页'], ['第二页']] });
  const params = new URLSearchParams({ on_conflict: 'key' });
  mutateContent(doc, 'site_config', 'POST', params, { key: ME_CONFIG_KEY, value: JSON.stringify(content) }, true);
  const visible = queryContent(doc, false, 'site_config', new URLSearchParams({ select: 'key,value' })).rows;
  assert.equal(visible.length, 1);
  const saved = parseMeContent(visible[0].value);
  assert.equal(saved.profile.name, 'Changed name');
  assert.deepEqual(saved.topics.at(-1).pages, [['第一页'], ['第二页']]);
  assert.equal(queryContent(doc, true, 'site_config', new URLSearchParams()).rows.length, 2);
});

test('missing saved content falls back to independent editable defaults', () => {
  const content = parseMeContent(null);
  content.profile.name = 'Changed';
  content.topics[0].pages[0][0] = 'Changed';
  assert.equal(defaultMeContent.profile.name, 'yuria');
  assert.notEqual(defaultMeContent.topics[0].pages[0][0], 'Changed');
});

test('invalid image schemes, empty and repeated topics, and oversized pages cannot be saved', () => {
  for (const url of ['javascript:alert(1)', '//other.example/a.png', 'http://other.example/a.png', 'https://user:password@example.com/a.png']) {
    const content = structuredClone(defaultMeContent); content.avatarUrl = url;
    assert.throws(() => parseMeContent(content));
  }
  const repeated = structuredClone(defaultMeContent);
  repeated.topics.push(structuredClone(repeated.topics[0]));
  assert.throws(() => parseMeContent(repeated));
  for (const page of [[], [''], ['a'.repeat(180), 'b'.repeat(180), 'c'.repeat(80)]]) {
    const content = structuredClone(defaultMeContent); content.topics[0].pages = [page];
    assert.throws(() => parseMeContent(content));
  }
});

test('optional introduction sections can be empty and topics can be removed', () => {
  const content = structuredClone(defaultMeContent);
  content.profile.quote = []; content.profile.tags = []; content.profile.about = ''; content.topics = [];
  assert.deepEqual(parseMeContent(JSON.stringify(content)), content);
});

test('old saved introductions keep their content and derive the same three album tiles', () => {
  const old = JSON.parse(JSON.stringify(defaultMeContent));
  const parsed = parseMeContent(old);
  assert.deepEqual(parsed, old);
  assert.equal(Object.hasOwn(parsed, 'moments'), false);
  assert.equal(Object.hasOwn(parsed, 'backgroundUrl'), false);
  assert.deepEqual(meMoments(parsed), [
    { kind: 'image', value: old.avatarUrl },
    { kind: 'quote', value: old.profile.quote.at(-1) },
    { kind: 'image', value: old.portraitUrl },
  ]);
});

test('independent album items and scene background survive saves; removing all items stays empty', () => {
  const content = structuredClone(defaultMeContent);
  content.backgroundUrl = 'https://images.example/scene.webp';
  content.moments = [{ kind: 'image', value: 'https://images.example/photo.jpg' }, { kind: 'quote', value: '自己的文字' }];
  const saved = parseMeContent(JSON.stringify(content));
  assert.deepEqual(saved, content);
  assert.deepEqual(meMoments(saved), content.moments);
  saved.moments = [];
  assert.deepEqual(meMoments(parseMeContent(saved)), []);
});

test('new image settings reject unsafe URLs and oversized albums without changing the source', () => {
  for (const change of [
    { backgroundUrl: 'javascript:alert(1)' },
    { moments: [{ kind: 'image', value: '//other.example/image.jpg' }] },
    { moments: [{ kind: 'quote', value: 'x'.repeat(121) }] },
    { moments: Array.from({ length: 13 }, () => ({ kind: 'quote', value: 'x' })) },
  ]) assert.throws(() => parseMeContent({ ...structuredClone(defaultMeContent), ...change }));
  assert.equal(Object.hasOwn(defaultMeContent, 'moments'), false);
});

test('photo wall keeps three independent slots and empty slots survive saving without avatar substitution', () => {
  const content = structuredClone(defaultMeContent);
  content.moments = [{ kind: 'image', value: '/photos/first.webp' }, { kind: 'image', value: '' }, { kind: 'image', value: '/photos/third.webp' }];
  const saved = parseMeContent(JSON.stringify(content));
  assert.deepEqual(mePhotoSlots(saved), ['/photos/first.webp', '', '/photos/third.webp']);
  saved.moments = [];
  assert.deepEqual(mePhotoSlots(parseMeContent(saved)), ['', '', '']);
  saved.moments = Array.from({ length: 4 }, (_, i) => ({ kind: 'image', value: `/photos/${i}.webp` }));
  assert.deepEqual(mePhotoSlots(saved), ['/photos/0.webp', '/photos/1.webp', '/photos/2.webp']);
  assert.equal(saved.moments.length, 4);
});

test('photo reordering keeps the displayed region attached to the original image through saving', () => {
  const content = structuredClone(defaultMeContent);
  content.moments = ['a', 'b', 'c'].map(name => ({ kind: 'image', value: `/photos/${name}.webp` }));
  content.frames = { avatarUrl: { x: 0, y: 0, zoom: 1.4 }, photos: [{ x: -.3, y: .2, zoom: 2 }, { x: 0, y: 0, zoom: 1 }, { x: .5, y: -.4, zoom: 1.5 }] };
  const moved = parseMeContent(JSON.stringify(moveMePhoto(content, 0, 2)));
  assert.deepEqual(mePhotoSlots(moved), ['/photos/b.webp', '/photos/c.webp', '/photos/a.webp']);
  assert.deepEqual(moved.frames.photos[2], content.frames.photos[0]);
  assert.deepEqual(moved.frames.avatarUrl, content.frames.avatarUrl);
  assert.deepEqual(mePhotoSlots(content), ['/photos/a.webp', '/photos/b.webp', '/photos/c.webp']);
  assert.equal(moveMePhoto(content, -1, 0), content);
  assert.deepEqual(meFrameStyle(moved.frames.photos[2]), { objectPosition: '35% 60%', transformOrigin: '35% 60%', transform: 'scale(2)' });
});

test('image region settings reject non-finite or out-of-range values', () => {
  for (const frame of [{ x: 2, y: 0, zoom: 1 }, { x: 0, y: -2, zoom: 1 }, { x: 0, y: 0, zoom: 10 }, { x: NaN, y: 0, zoom: 1 }, { x: 0, y: 0 }, null]) {
    assert.throws(() => parseMeContent({ ...structuredClone(defaultMeContent), frames: { avatarUrl: frame } }));
  }
  assert.throws(() => parseMeContent({ ...structuredClone(defaultMeContent), frames: { photos: Array(4).fill({ x: 0, y: 0, zoom: 1 }) } }));
});

test('Enter-style tag additions trim, deduplicate, and enforce profile limits', () => {
  assert.deepEqual(addMeTag(['自由'], '  音乐  '), ['自由', '音乐']);
  assert.deepEqual(addMeTag(['自由'], '自由'), ['自由']);
  assert.deepEqual(addMeTag(['自由'], ' '), ['自由']);
  assert.throws(() => addMeTag([], 'a'.repeat(25)));
  assert.throws(() => addMeTag(Array.from({ length: 8 }, (_, i) => String(i)), 'more'));
});


test('profile cover remains independent from the scene background through saves', () => {
  const input = structuredClone(defaultMeContent);
  input.coverUrl = 'https://images.example/cover.webp';
  input.backgroundUrl = 'https://images.example/scene.webp';
  input.frames = { coverUrl: { x: 0, y: .2, zoom: 1.2 } };
  const saved = parseMeContent(JSON.stringify(input));
  assert.equal(saved.coverUrl, input.coverUrl);
  assert.equal(saved.backgroundUrl, input.backgroundUrl);
  assert.deepEqual(saved.frames.coverUrl, input.frames.coverUrl);
  assert.throws(() => parseMeContent({ ...input, coverUrl: 'javascript:alert(1)' }));
  assert.throws(() => parseMeContent({ ...input, frames: { coverUrl: { x: 0, y: 0, zoom: Infinity } } }));
});
