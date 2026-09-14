import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCageTitle, validateCageTitleLayout, cageTitleGeometry } from '../src/core/cage-title-layout.js';
const title="'케이지메뉴오픈' 이게진짜 싸움이다.";
const split=Array.from("'케이지메뉴오픈'").length;
test('manual break keeps the chosen wording and line boundary',()=>{
 const layout=validateCageTitleLayout(title,{title,breakAt:split,emphasis:'second'});
 const result=cageTitleGeometry(title,layout);
 assert.deepEqual(result.lines.map(x=>x.text),["'케이지메뉴오픈'",'이게진짜 싸움이다.']);
 assert.ok(result.lines[1].size>result.lines[0].size);
});
test('stored layout cannot follow a different title after the source post changes',()=>{
 assert.throws(()=>validateCageTitleLayout('바뀐 제목',{title,breakAt:split,emphasis:'equal'}),/CAGE_TITLE_CHANGED/);
 assert.equal(cageTitleGeometry('바뀐 제목',{title,breakAt:split,emphasis:'equal'}),null);
});
test('spaced titles reject manual breaks inside a word',()=>{
 assert.throws(()=>validateCageTitleLayout('주거 정책 토론',{title:'주거 정책 토론',breakAt:1,emphasis:'equal'}),/CAGE_TITLE_BREAK_INVALID/);
 assert.equal(validateCageTitleLayout('주거 정책 토론',{title:'주거 정책 토론',breakAt:2,emphasis:'equal'}).breakAt,2);
});
test('titles without spaces retain deliberate codepoint break choices',()=>{
 const title='정책🙂토론';
 assert.equal(validateCageTitleLayout(title,{title,breakAt:3,emphasis:'equal'}).breakAt,3);
});
test('long manual lines are rejected instead of cut or split again',()=>{
 assert.throws(()=>validateCageTitleLayout('긴제목'.repeat(35),{title:'긴제목'.repeat(35),breakAt:3,emphasis:'equal'}),/CAGE_TITLE_TOO_LONG/);
});
test('manual geometry fits the approved title board without clipping',()=>{
 for(const emphasis of ['first','second','equal'])for(const input of [title,'정치, 이제 시민이 판단한다']){
  const breakAt=Array.from(input).findIndex(char=>char===' '),layout=validateCageTitleLayout(input,{title:input,breakAt,emphasis});
  for(const line of cageTitleGeometry(input,layout).lines){assert.ok(line.width<=1015);assert.ok(line.top>=84);assert.ok(line.bottom<=366);}
 }
 assert.equal(normalizeCageTitle('  한\n  문장  '),'한 문장');
});
