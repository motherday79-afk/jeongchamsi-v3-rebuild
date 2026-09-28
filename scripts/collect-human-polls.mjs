import {writeFile} from 'node:fs/promises';
import {collectDocumentPolls} from '../lib/human-poll-document-collector.js';
import {collectOfficialPolls} from '../lib/human-poll-sources.js';
import {validateCollectedSnapshot} from '../lib/human-poll-pipeline.js';
import {collectNbsInBrowser} from './probe-nbs-browser.mjs';
const collectedAt=new Date().toISOString();
const results=await Promise.allSettled([
 collectDocumentPolls({providerIds:['gallup','realmeter']}),
 collectOfficialPolls({providerIds:['realmeter'],limit:1}),
 collectNbsInBrowser()
]);
const candidates=results.flatMap(r=>r.status==='fulfilled'?r.value.items:[]);
// One bounded retry for a transient Gallup network error. Never copy an old snapshot as fresh.
if(!candidates.some(p=>p.provenance.provider==='gallup'))candidates.push(...(await collectDocumentPolls({providerIds:['gallup']})).items);
const items=['gallup','realmeter','nbs'].flatMap(id=>{
 const choices=candidates.filter(p=>p.provenance.provider===id).sort((a,b)=>b.publishedDate.localeCompare(a.publishedDate)||Number(!!b.evidence)-Number(!!a.evidence));return choices.slice(0,1);
});
const providers=['gallup','realmeter','nbs'].map(id=>({id,state:items.some(p=>p.provenance.provider===id)?'success':'error',fetchedCount:items.some(p=>p.provenance.provider===id)?1:0,checkedAt:collectedAt}));
const snapshot={schema:'JCS_OFFICIAL_POLL_SNAPSHOT_V2',collectedAt,items,providers};
validateCollectedSnapshot(snapshot);
await writeFile('poll-output.json',JSON.stringify(snapshot));
console.log('COLLECTION_RESULT',JSON.stringify(providers));
console.log('COLLECTION_SOURCES',JSON.stringify(items.map(p=>({provider:p.provenance.provider,date:p.publishedDate,url:p.sourceUrl,document:!!p.evidence}))));
