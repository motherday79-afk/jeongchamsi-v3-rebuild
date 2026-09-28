import {writeFile} from 'node:fs/promises';
import {collectDocumentPolls} from '../lib/human-poll-document-collector.js';
import {collectOfficialPolls,fetchOfficialHtml} from '../lib/human-poll-sources.js';
const result=await collectDocumentPolls();
await writeFile('poll-output.json',JSON.stringify({schema:'JCS_OFFICIAL_POLL_SNAPSHOT_V1',...result}));
console.log(JSON.stringify(result.providers));
const summaries=await collectOfficialPolls();
console.log('PUBLIC_SUMMARY_PROVIDERS',JSON.stringify(summaries.providers));
console.log('PUBLIC_SUMMARY_ITEMS',JSON.stringify(summaries.items.map(p=>({provider:p.provenance.provider,date:p.publishedDate,url:p.sourceUrl}))));
for(const url of ['https://www.realmeter.net/','https://nbsurvey.kr/files']){
 try{const html=await fetchOfficialHtml(url);console.log('OFFICIAL_HTTPS',url,html.length,html.length<2000?html:'normal-document');}catch(error){console.log('OFFICIAL_HTTPS',url,error.message);}
}
