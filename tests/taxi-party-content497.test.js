import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PARTY_CATALOG,PARTY_QUESTIONS} from '../lib/taxi-party-content.js';
import {PARTY_INTRO,PARTY_COMFORT,PARTY_CLOSING} from '../lib/taxi-party-service.js';
import {audioUrl} from '../lib/taxi-audio.js';

test('party catalog has 18 distinct questions, six equal domains and four sourced anonymous alternatives',()=>{
 assert.equal(PARTY_CATALOG.length,4);assert.equal(PARTY_QUESTIONS.length,18);
 assert.equal(new Set(PARTY_QUESTIONS.map(q=>q.id)).size,18);
 const domains=new Map();const speeches=[];
 for(const q of PARTY_QUESTIONS){domains.set(q.domain,(domains.get(q.domain)||0)+1);assert.ok(q.title&&q.version&&q.context);assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.partyId)).size,4);
  for(const o of q.options){assert.ok(PARTY_CATALOG.some(p=>p.id===o.partyId));assert.ok(o.text.length>10&&o.speech.length>=150);assert.ok(o.sources.length);
   for(const p of PARTY_CATALOG)assert.equal((o.text+o.speech).includes(p.name),false,q.id);
   for(const source of o.sources){assert.match(source.date,/\d{4}-\d{2}-\d{2}/);assert.ok(source.title);assert.equal(new URL(source.url).protocol,'https:');}
   speeches.push(o.speech);
  }
 }
 assert.equal(domains.size,6);assert.ok([...domains.values()].every(n=>n===3));assert.equal(new Set(speeches).size,72);
});
test('every party narration and guidance has an actual local MP3 and matching sentence timeline',()=>{
 const texts=[PARTY_INTRO,PARTY_COMFORT,PARTY_CLOSING,...PARTY_QUESTIONS.flatMap(q=>q.options.map(o=>o.speech))];
 for(const text of texts){const file=audioUrl(text,'M1').slice(1),cues=JSON.parse(fs.readFileSync(file.replace('.mp3','.json'),'utf8'));assert.ok(fs.statSync(file).size>10000,file);assert.ok(cues.length>=3);assert.equal(cues.map(c=>c.text).join(' '),text);let end=0;for(const cue of cues){assert.ok(cue.start>=end-.001);assert.ok(cue.duration>0);end=cue.start+cue.duration;}assert.ok(end>=20&&end<90,`${file} ${end}`);}
});
