import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {usesJcsFlag,personPartyMarkup} from '../src/ui/person-party.js';
import {GOVERNMENT_PHOTOS} from '../src/data/government-photos.js';
import {GOVERNMENT_POLITICIANS} from '../src/data/government-people.js';
import {readPoliticianPhotos} from '../lib/politician-store.js';
import {TARGET_KEYS} from '../lib/migration-service.js';
import {renderNowRankCard} from '../src/layout/home-layout.js';
import {renderTaxiPersonStats} from '../src/views/taxi-person.js';
import {renderPresidentPage} from '../src/views/president.js';
test('J is a display marker without rewriting registered party membership',()=>{
 for(const p of [{id:'government-001',party:''},{id:'government-001',party:'무소속'},{id:'nonincumbent-001',party:'무소속'},{personId:'nonincumbent-001',partyLabel:'무소속'},{id:'nonincumbent-012',party:''}]){const before=JSON.stringify(p);assert.equal(usesJcsFlag(p),true);assert.match(personPartyMarkup(p),/jcs-flag-494.svg/);assert.equal(JSON.stringify(p),before);}
 for(const p of [{id:'assembly-005',party:'무소속'},{id:'government-001',party:'더불어민주당'},{id:'nonincumbent-005',party:'국민의힘'}])assert.equal(usesJcsFlag(p),false);
 assert.equal(usesJcsFlag({isVacant:true,party:''}),false);
 assert.equal(personPartyMarkup({party:'<script>'}),'&lt;script&gt;');
});
test('22 new government portraits are local WebP assets with provenance',()=>{
 assert.equal(Object.keys(GOVERNMENT_PHOTOS).length,22);
 for(const p of GOVERNMENT_POLITICIANS){const image=GOVERNMENT_PHOTOS[p.id];assert.equal(image.name,p.name);assert.match(image.localPath,/^\/assets\/politicians\/government-\d{3}-494.webp$/);const bytes=fs.readFileSync(new URL('..'+image.localPath,import.meta.url));assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.equal(bytes.length,image.bytes);assert.ok(image.sourcePage.startsWith('https://'));assert.ok(image.attribution);}
});
test('government fallback fills absent or empty entries and preserves user photo overrides',async()=>{
 const command=async([,key])=>key===TARGET_KEYS.politicianPhotos?JSON.stringify({items:{'government-001':{},'government-002':{localPath:'/existing.webp'}}}):key===TARGET_KEYS.politicianPhotoOverrides?JSON.stringify({items:{'government-003':{url:'/custom.webp'}}}):null;
 const photos=await readPoliticianPhotos(command);assert.equal(photos['government-001'].localPath,GOVERNMENT_PHOTOS['government-001'].localPath);assert.equal(photos['government-002'].localPath,'/existing.webp');assert.equal(photos['government-003'].url,'/custom.webp');
});
test('ranking, taxi profile and president page consume the shared local identity assets',()=>{
 const hong={id:'nonincumbent-001',type:'nonincumbent',name:'홍준표',office:'전 대구광역시장',party:'무소속'};
 const card=renderNowRankCard(hong);assert.match(card,/party-jcs/);assert.doesNotMatch(card,/무소속/);
 const taxi=renderTaxiPersonStats({registered:false},hong);assert.match(taxi,/jcs-flag-494.svg/);assert.doesNotMatch(taxi,/무소속/);
 const president=renderPresidentPage();assert.equal((president.match(/class="president-profile-photo"/g)||[]).length,27);assert.doesNotMatch(president,/<img[^>]+src="https?:/);
});
