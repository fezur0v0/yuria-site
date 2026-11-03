import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEchoTags, serializeEchoTags } from '../utils/notes/echo-tags.ts';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { mutateContent, queryContent } from '../utils/migration/query.ts';

test('legacy labels stay whole, including spaces and punctuation', () => {
  assert.deepEqual(parseEchoTags(null), []);
  assert.deepEqual(parseEchoTags('  日常, 小事 / extra tag  '), ['日常, 小事 / extra tag']);
  assert.deepEqual(parseEchoTags('日常\r\n\n 日常 \n小事'), ['日常', '小事']);
});

test('multiple Echo tags survive editing and remain searchable and private', () => {
  const document = { version: 1, tables: Object.fromEntries(CONTENT_TABLES.map(name => [name, []])) };
  const extra_tag = serializeEchoTags(['日常', '甜甜的', '日常']);
  mutateContent(document, 'theater_records', 'POST', new URLSearchParams(), { id: 'echo', title: 'Echo', extra_tag }, false);
  const search = new URLSearchParams({ extra_tag: 'ilike.%甜甜的%' });
  const rows = queryContent(document, true, 'theater_records', search).rows;
  assert.deepEqual(parseEchoTags(rows[0].extra_tag), ['日常', '甜甜的']);
  assert.deepEqual(queryContent(document, false, 'theater_records', search).rows, []);
  mutateContent(document, 'theater_records', 'PATCH', new URLSearchParams({ id: 'eq.echo' }), { extra_tag: null }, false);
  assert.deepEqual(parseEchoTags(document.tables.theater_records[0].extra_tag), []);
});
