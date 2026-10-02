import {writeFile} from 'node:fs/promises';
import {collectPartyPolls} from '../lib/party-poll-sources.js';
import {publicPartyPoll} from '../lib/party-poll-service.js';
const result=await collectPartyPolls();
if(!result.items.some(p=>p.provenance.provider==='nbs')){
 try{const {collectNbsInBrowser}=await import('./probe-nbs-browser.mjs');result.items.push(...(await collectNbsInBrowser({collector:collectPartyPolls})).items);}catch{console.log('PARTY_NBS_BROWSER_UNAVAILABLE');}
}
const items=result.items.map(publicPartyPoll).filter(Boolean);
const providers=['gallup','realmeter','nbs'].map(id=>({id,state:items.some(p=>p.provenance.provider===id)?'success':'error'}));
const snapshot={schema:'JCS_PARTY_POLL_SNAPSHOT_V1',collectedAt:new Date().toISOString(),items,providers};
await writeFile('party-poll-output.json',JSON.stringify(snapshot));
console.log('PARTY_COLLECTION',JSON.stringify(providers));
console.log('PARTY_SOURCES',JSON.stringify(items.map(p=>({provider:p.provenance.provider,date:p.publishedDate,url:p.sourceUrl}))));
