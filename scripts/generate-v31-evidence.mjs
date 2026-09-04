import { mkdir, writeFile } from 'node:fs/promises';
import { POLITICIAN_SEED } from '../lib/politician-seed.generated.js';
import { buildIntelligenceDraft } from '../lib/intelligence-analysis.js';
import { projectIntelligence } from '../lib/intelligence-access.js';
import { validateIntelligenceDraft } from '../lib/intelligence-validation.js';
import { renderPoliticianDetail } from '../src/views/politicians.js';
import { renderPoliticianCompare } from '../src/views/politician-compare.js';

const output=new URL('../artifacts/',import.meta.url),people=Object.values(POLITICIAN_SEED.profiles).flat().filter(person=>!person.isVacant);
const ageSex=[{age:'20대',maleShare:55,femaleShare:45},{age:'30대',maleShare:52,femaleShare:48},{age:'40대',maleShare:48,femaleShare:52},{age:'50대',maleShare:46,femaleShare:54},{age:'60대 이상',maleShare:44,femaleShare:56}];
const fixture=(person,title=`${person.name} ${person.jurisdiction||person.region} 민생 정책 현장 발표`)=>({snapshotId:'jcs-20260904-v31',collectedAt:'2026-09-04T00:00:00Z',officialProfile:person,searchAds:{volume:{pc:48600,mobile:231200}},news:{items:[{title,source:'검증 자료',publishedAt:'2026-09-04',url:'https://example.com/evidence'}]},sourceErrors:[]});
const context={peers:people,ageSex};
const reportFor=(person,raw=fixture(person))=>({...buildIntelligenceDraft(person,raw,context,'JCS_INTELLIGENCE_V3'),rank:{overall:person.slot||1,category:person.slot||1,temporary:false}});
const wrap=(title,body,mobile=false)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="../css/app.css?v=0.0.31"><link rel="stylesheet" href="../css/pages.css?v=0.0.31"><style>html{background:#edf2f0}body{margin:0 auto;padding:18px;max-width:${mobile?'390px':'1240px'};background:#f7faf9}.site-header,.site-footer{display:none}${mobile?'.person-live-hero,.jcs-diagnostic-member-grid,.jcs-diagnostic-admin-grid,.jcs-diagnostic-opportunity-risk,.jcs-prescription-grid,.jcs-priority-board>div{grid-template-columns:1fr!important}.jcs-politician-type{grid-template-columns:1fr!important}.jcs-compare-matrix{max-width:390px;overflow-x:auto}.politician-compare-page{width:100%}':''}</style></head><body>${body}</body></html>`;

await mkdir(output,{recursive:true});
const lee=people.find(person=>person.name==='이진숙');
const leeRaw={...fixture(lee),news:{items:[
  {title:'5·18 유공자들, 이진숙 상대 손배소 청구…1인당 3000만원',source:'검증 자료',publishedAt:'2026-09-03',url:'https://example.com/lee-1'},
  {title:'이진숙 5·18 발언 놓고 유공자 손해배상 소송 제기',source:'검증 자료',publishedAt:'2026-09-02',url:'https://example.com/lee-2'}
]}};
const leeReport=reportFor(lee,leeRaw),detailService={async get(){return {ok:true,item:{...lee,photo:POLITICIAN_SEED.photos[lee.id]},intelligence:projectIntelligence(leeReport,'admin','detail')};}};
const detail=await renderPoliticianDetail(lee.id,detailService,{authenticated:true,user:{role:'admin'}});
await writeFile(new URL('jcs-v31-admin-detail-desktop.html',output),wrap('JCS V3 관리자 상세',detail),{mode:0o600});

const comparePeople=['한동훈','김민석','오세훈','추경호'].map(name=>people.find(person=>person.name===name)),reports=new Map(comparePeople.map(person=>[person.id,reportFor(person)]));
const compareService={async search(){return {ok:true,items:comparePeople};},async get(id){const item=comparePeople.find(person=>person.id===id);return item?{ok:true,item}:{ok:false};},async getForCompare(id){const item=comparePeople.find(person=>person.id===id);return item?{ok:true,item:{...item,photo:POLITICIAN_SEED.photos[item.id]},intelligence:projectIntelligence(reports.get(id),'admin','compare')}:{ok:false};}};
const compare=await renderPoliticianCompare(compareService,`/compare?ids=${comparePeople.map(person=>person.id).join(',')}&run=1`,{authenticated:true,user:{role:'admin'}});
await writeFile(new URL('jcs-v31-admin-compare-mobile.html',output),wrap('JCS V3 관리자 비교 모바일',compare,true),{mode:0o600});

const validationNames=['한동훈','천하람','김민석','전용기','용혜인','송영길','오세훈','추경호','신상진','김용민'];
const validationGroup=validationNames.map(name=>{const person=people.find(row=>row.name===name),report=reportFor(person);return {name,id:person.id,primaryType:report.politicianType.primaryType,secondaryTypes:report.politicianType.secondaryTypes,currentPhase:report.politicianType.currentPhase,evidence:report.politicianType.typeEvidence,validation:validateIntelligenceDraft(report)};});
const evidence={generatedAt:'2026-09-04T00:00:00Z',algorithmVersion:'JCS_INTELLIGENCE_V3',registeredActiveProfiles:people.length,goldenSample:{name:lee.name,primaryType:leeReport.politicianType.primaryType,secondaryTypes:leeReport.politicianType.secondaryTypes,currentPhase:leeReport.politicianType.currentPhase,eventClusters:leeReport.eventClusters,politicalAssetMatrix:leeReport.politicalAssetMatrix,validation:validateIntelligenceDraft(leeReport)},validationGroup};
await writeFile(new URL('jcs-v31-validation-results.json',output),`${JSON.stringify(evidence,null,2)}\n`,{mode:0o600});
console.log(JSON.stringify({output:new URL('.',output).pathname,detailTopics:leeReport.diagnoses.length,detailPrescriptions:leeReport.prescriptions.length,compareCount:comparePeople.length,validationGroup:validationGroup.length,goldenValidation:evidence.goldenSample.validation}));
