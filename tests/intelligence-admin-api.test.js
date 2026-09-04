import test from 'node:test';
import assert from 'node:assert/strict';

import { dispatchAdminIntelligence } from '../api/gateway.js';

function serviceDouble(){
  const calls=[];
  const service={
    async status(){calls.push('status');return {collection:{status:'RUNNING',completed:25,total:542}};},
    async startCollection(){calls.push('collect-start');return {job:{status:'RUNNING'}};},
    async runCollectionStep(){calls.push('collect-step');return {job:{status:'RUNNING',completed:25,total:542}};},
    async preview(){calls.push('preview');return {ok:true,completed:542,total:542};},
    async updateDraft(input){calls.push(`draft-update:${input.personId}`);return {draft:{id:input.personId}};},
    async approveDraft(input){calls.push(`approve:${input.reviewedBy}`);return {version:{status:'approved'}};},
    async startPublish(){calls.push('publish-start');return {job:{status:'RUNNING'}};},
    async runPublishStep(){calls.push('publish-step');return {job:{status:'COMPLETED'}};},
  };
  return {service,calls};
}

test('admin intelligence routes map collection, review, approval and publication actions',async()=>{
  const {service,calls}=serviceDouble();
  const routes=[
    ['admin/intelligence/status','GET','status'],
    ['admin/intelligence/collect/start','POST','collect-start'],
    ['admin/intelligence/collect/step','POST','collect-step'],
    ['admin/intelligence/preview','GET','preview'],
    ['admin/intelligence/draft','PATCH','draft-update:p1'],
    ['admin/intelligence/approve','POST','approve:admin'],
    ['admin/intelligence/publish/start','POST','publish-start'],
    ['admin/intelligence/publish/step','POST','publish-step'],
  ];
  for(const [route,method,expected] of routes){
    const result=await dispatchAdminIntelligence(route,method,service,{personId:'p1',reviewedBy:'admin'});
    assert.equal(result.status,200);
    assert.equal(result.body.ok,true);
    assert.equal(calls.at(-1),expected);
  }
});

test('admin intelligence routes reject wrong methods and unknown routes',async()=>{
  const {service,calls}=serviceDouble();
  assert.deepEqual(await dispatchAdminIntelligence('admin/intelligence/status','POST',service),{status:405,body:{ok:false,error:'METHOD_NOT_ALLOWED'}});
  assert.equal((await dispatchAdminIntelligence('admin/intelligence/nope','GET',service)).status,404);
  assert.equal(calls.length,0);
});

test('service errors are converted into stable API errors',async()=>{
  const service={async startPublish(){throw Object.assign(new Error('COLLECTION_NOT_READY'),{code:'COLLECTION_NOT_READY'});}};
  const result=await dispatchAdminIntelligence('admin/intelligence/publish/start','POST',service);
  assert.deepEqual(result,{status:409,body:{ok:false,error:'COLLECTION_NOT_READY'}});
});
