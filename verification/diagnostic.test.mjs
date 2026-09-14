import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {snapshotDocument, removePresentation, safeUrl, interpret} from '../jcs-touch-check/core.mjs';

test('static comparison removes executable handlers but preserves the suspect native link and visual content',()=>{
 const dom=new JSDOM('<!doctype html><html><head><style>h2{color:purple}</style><script>window.trigger=true</script></head><body onload="trigger()"><h2 onclick="trigger()" style="color:purple">나는 이렇게 제안합니다</h2><a href="mailto:contact@example.com">문의</a><a href="/itsme/one">글</a><template><script>trigger()</script><b onclick="trigger()">보관</b></template><div data-jcs-check-host>도구</div><input value="private draft"><textarea>private draft</textarea></body></html>');
 const result=new JSDOM(snapshotDocument(dom.window.document)).window.document;
 assert.equal(result.querySelectorAll('script,[onclick],[onload],[data-jcs-check-host]').length,0);
 assert.equal(result.querySelector('template').content.querySelectorAll('script,[onclick]').length,0);
 assert.equal(result.querySelector('a').getAttribute('href'),'mailto:contact@example.com');
 assert.equal(result.querySelector('h2').style.color,'purple');
 assert.equal(result.querySelectorAll('style').length,1);
 assert.equal(result.querySelector('input').value,'');
 assert.equal(result.querySelector('textarea').value,'');
 dom.window.close();
});
test('style comparison removes inline and sheet styling without removing links or event handlers',()=>{
 const dom=new JSDOM('<style>h2{color:purple}</style><link rel="stylesheet" href="/css/app.css"><h2 style="color:purple">제목</h2><button>버튼</button><a href="mailto:contact@example.com">문의</a>');
 let clicks=0; dom.window.document.querySelector('button').addEventListener('click',()=>clicks++);
 removePresentation(dom.window.document);
 assert.equal(dom.window.document.querySelectorAll('style,link[rel~="stylesheet"],[style]').length,0);
 dom.window.document.querySelector('button').click(); assert.equal(clicks,1);
 assert.equal(dom.window.document.querySelector('a').getAttribute('href'),'mailto:contact@example.com');
 dom.window.close();
});
test('report excludes mailbox addresses and query contents while retaining the URI scheme',()=>{
 assert.equal(safeUrl('mailto:person@example.com?body=secret','https://www.jeongchamsi.com'),'mailto:[address]');
 assert.equal(safeUrl('/person/metropolitan-001?q=secret','https://www.jeongchamsi.com'),'https://www.jeongchamsi.com/person/metropolitan-001');
});
test('comparison cannot imply a cause until its own baseline reproduces',()=>{
 assert.match(interpret({base:'no',static:'no',plain:'no'}),/판단할 수 없/);
 assert.match(interpret({base:'yes',static:'no',plain:'yes'}),/실행 코드/);
});
