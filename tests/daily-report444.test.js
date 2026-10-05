import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,profiles,rawFor,storage} from './helpers/person-refresh-fixture.js';
import {makeDailyReport,compareDailyReports} from '../src/core/daily-report.js';
import {stageDailyReport,makeDailyManifest,dailyManifestKey,readDailyReport,readDailyHistory} from '../lib/daily-report-store.js';
import {encodeStored} from '../lib/intelligence-repository.js';
import {buildIntelligenceDraft} from '../lib/intelligence-analysis.js';
import {projectIntelligence} from '../lib/intelligence-access.js';
import {renderDailyReportBody} from '../src/views/daily-report.js';
import {handlePoliticians} from '../api/gateway.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
const person=profiles[0];
function record(){return makeDailyReport(person,projectIntelligence(buildIntelligenceDraft(person,rawFor(person)),'admin'),'2026-09-16T12:00:00Z');}
test('report stores nine topics but renders only nine concise highlights',()=>{
 const r=record();assert.equal(r.topics.length,9);assert.equal(r.raw,undefined);assert.equal(r.prescriptions,undefined);
 const html=renderDailyReportBody(r);assert.doesNotMatch(html,/dr-scene|dr-podium|dr-cohorts/);assert.equal((html.match(/data-summary-topic=/g)||[]).length,9);assert.doesNotMatch(html,/판단 근거 보기/);assert.doesNotMatch(html,/\[object Object\]|undefined|NaN/);
 r.name='<script>alert(1)</script>';assert.doesNotMatch(renderDailyReportBody(r),/<script>/);
});
test('unpublished records remain invisible; exact dates, missing history and schema changes are handled',async()=>{
 const db=storage(),r=record();await stageDailyReport(db.command,'s1',r);assert.equal(await readDailyReport(db.command,r.id,r.date),null);
 await db.command(['SET',dailyManifestKey(r.date),encodeStored(makeDailyManifest({snapshot:'s1',at:r.observedAt,ids:[r.id],rankings:{byId:{[r.id]:{rank:3,categoryRank:2}}}}))]);
 const saved=await readDailyReport(db.command,r.id,r.date);assert.equal(saved.rank.overall,3);
 const current={...r,date:'2026-09-17',rank:{overall:1}};const history=await readDailyHistory(db.command,r.id,current,'',Date.parse('2026-09-17T12:00:00Z'));
 assert.equal(history.comparisons['24H'].ready,true);assert.equal(history.comparisons['24H'].rankDelta,2);assert.equal(history.comparisons['7D'].ready,false);
 assert.equal(compareDailyReports(current,{...saved,algorithmVersion:'old'}).ready,false);
 assert.equal(compareDailyReports({...r,topics:[{id:'01',score:null}]},r).rows[0].delta,null);
});
test('successful publication atomically exposes daily report and repeated publication freezes that day',async()=>{
 const f=await fixture();await f.service.startPublish();const result=await f.service.runPublishStep();assert.equal(result.finalized.ok,true);
 const original=await readDailyReport(f.db.command,person.id,'2026-09-16');assert.equal(original.topics.length,9);assert.equal(original.rank.overall,(await f.repo.getRankings('base')).byId[person.id].rank);
 assert.ok(f.db.calls.some(a=>a[0]==='EVAL'&&a.includes(dailyManifestKey('2026-09-16'))));
 await f.service.runPublishStep();assert.deepEqual(await readDailyReport(f.db.command,person.id,'2026-09-16'),original);
 await f.repo.cleanupObsoleteSnapshots(['another']);assert.deepEqual(await readDailyReport(f.db.command,person.id,'2026-09-16'),original);
});
test('history endpoint denies unauthenticated requests before reading archives',async()=>{
 const calls=[];const command=async a=>{calls.push(a);return a[1]===TARGET_KEYS.politicians('assembly')?JSON.stringify({items:[person]}):null;};
 let status,body;const res={setHeader(){},set statusCode(v){status=v},end(v){body=JSON.parse(v)}};
 await handlePoliticians({method:'GET',headers:{},query:{}},res,command,new URL('https://example.org/api/v3/politicians?id='+person.id+'&reportHistory=1'),{getPublicIntelligence:async()=>buildIntelligenceDraft(person,rawFor(person))});
 assert.equal(status,403);assert.equal(body.error,'REPORT_ACCESS_REQUIRED');assert.equal(calls.some(a=>a.some(v=>String(v).includes('jcs:daily-report'))),false);
});
