import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderCageTitleEditor } from '../src/ui/cage-title-editor.js';

test('editor restores a saved layout across whitespace-only title changes',()=>{
 const html=renderCageTitleEditor([{id:'one',title:'  주거\n  정책  ',createdAt:'2026-09-01'}],'one',{one:{title:'주거 정책',breakAt:2,emphasis:'first'}});
 assert.match(html,/name="cageTitleEnabled" checked/);
 assert.match(html,/name="cageTitleSource" value="주거 정책"/);
});

test('editor defaults to the approved original art when no manual layout is saved',()=>{
 const html=renderCageTitleEditor([{id:'one',title:"'인사청문회' 게임을 시작해 볼까?"}],'one');
 assert.doesNotMatch(html,/name="cageTitleEnabled" checked/);
 assert.match(html,/cage-approved-156\.webp/);
});

test('changing a break or emphasis select enables manual layout',async()=>{
 const source=await readFile(new URL('../src/ui/cage-title-editor.js',import.meta.url),'utf8');
 assert.match(source,/\['cageTitleBreak','cageTitleEmphasis'\]\.includes\(event\.target\.name\)/);
 assert.match(source,/cageTitleEnabled/);
});
