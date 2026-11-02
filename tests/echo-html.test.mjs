import test from 'node:test';
import assert from 'node:assert/strict';
import { echoHtmlKey, parseEchoHtml, echoHtmlDocument, MAX_ECHO_HTML } from '../utils/notes/echo-html.ts';
import { CONTENT_TABLES } from '../utils/migration/backup.ts';
import { mutateContent, queryContent } from '../utils/migration/query.ts';
test('interactive HTML saves privately and independently from Echo prose',()=>{
 const document={version:1,tables:Object.fromEntries(CONTENT_TABLES.map(name=>[name,[]]))};
 const html='<button onclick="this.textContent=\'Hi\'">Click</button><script>let count=0</script>';
 document.tables.theater_records.push({id:'one',content:'keep my prose'});
 for(const id of ['one','two'])mutateContent(document,'site_config','POST',new URLSearchParams({on_conflict:'key'}),{key:echoHtmlKey(id),value:JSON.stringify({html:id==='one'?html:'another'})},true);
 assert.equal(parseEchoHtml(queryContent(document,true,'site_config',new URLSearchParams({key:`eq.${echoHtmlKey('one')}`})).rows[0].value),html);
 assert.equal(parseEchoHtml(queryContent(document,true,'site_config',new URLSearchParams({key:`eq.${echoHtmlKey('two')}`})).rows[0].value),'another');
 assert.equal(document.tables.theater_records[0].content,'keep my prose');
 assert.deepEqual(queryContent(document,false,'site_config',new URLSearchParams()).rows,[]);
 assert.throws(()=>mutateContent(document,'site_config','POST',new URLSearchParams(),{key:echoHtmlKey('one'),value:'overwrite'},false));
});
test('missing HTML stays blank and malformed or oversized content is rejected',()=>{
 assert.equal(parseEchoHtml(null),'');assert.equal(parseEchoHtml({html:''}),'');
 for(const value of ['broken',[],{},{html:1},{html:'x'.repeat(MAX_ECHO_HTML+1)}])assert.throws(()=>parseEchoHtml(value));
});
test('the preview policy precedes submitted markup and allows inline interaction only',()=>{
 const markup='<script>document.body.dataset.clicked="yes"</script>';
 const output=echoHtmlDocument(markup);
 assert.ok(output.indexOf('Content-Security-Policy')<output.indexOf(markup));
 for(const rule of ["script-src 'unsafe-inline'","connect-src 'none'","frame-src 'none'","base-uri 'none'","form-action 'none'"])assert.ok(output.includes(rule));
});
