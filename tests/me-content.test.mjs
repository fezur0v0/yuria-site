import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultMeContent, meMoments, parseMeContent, ME_CONFIG_KEY } from '../components/me/content.ts';
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
