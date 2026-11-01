import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRecordProfile, parseRecordProfile, recordProfileKey } from '../utils/notes/record-profile.ts';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { queryContent, mutateContent } from '../utils/migration/query.ts';

test('record introductions and pair signatures save independently and remain private', () => {
  const document = { version: 1, tables: Object.fromEntries(CONTENT_TABLES.map(name => [name, []])) };
  const self = { ...emptyRecordProfile, name: 'yuria', bio: '我的介绍', avatar: '/api/notes/media?path=records-profile%2Favatar.webp' };
  const pair = { ...emptyRecordProfile, name: '凛', bio: '只属于我们的个签' };
  for (const [key,value] of [[recordProfileKey(),self],[recordProfileKey('character-1'),pair]]) {
    mutateContent(document, 'site_config', 'POST', new URLSearchParams({on_conflict:'key'}), {key,value:JSON.stringify(parseRecordProfile(value))}, true);
  }
  for (const [key,expected] of [[recordProfileKey(),self],[recordProfileKey('character-1'),pair]]) {
    const rows = queryContent(document,true,'site_config',new URLSearchParams({key:`eq.${key}`})).rows;
    assert.deepEqual(parseRecordProfile(rows[0].value),expected);
  }
  assert.deepEqual(queryContent(document,false,'site_config',new URLSearchParams()).rows,[]);
  assert.deepEqual(queryContent(document,false,'site_config',new URLSearchParams({key:`eq.${recordProfileKey()}`})).rows,[]);
  assert.throws(()=>mutateContent(document,'site_config','POST',new URLSearchParams(),{key:recordProfileKey(),value:'overwrite'},false));
});

test('missing introductions remain blank and unsafe media or oversized values cannot save', () => {
  assert.deepEqual(parseRecordProfile(null),emptyRecordProfile);
  for (const source of ['https://example.com/image.png','https://private.local/api/notes/media?path=a.png','javascript:alert(1)','/api/notes/media?path=../private','/api/notes/media?path=a.png&token=x']) {
    assert.throws(()=>parseRecordProfile({...emptyRecordProfile,cover:source}));
  }
  assert.throws(()=>parseRecordProfile({...emptyRecordProfile,bio:'x'.repeat(601)}));
  assert.throws(()=>parseRecordProfile({...emptyRecordProfile,name:'x'.repeat(61)}));
});
