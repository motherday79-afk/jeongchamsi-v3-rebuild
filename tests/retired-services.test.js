import test from 'node:test';import assert from 'node:assert/strict';
import handler from '../api/gateway.js';
import {renderHomeLayout} from '../src/layout/home-layout.js';
import {HOME_FIXTURE} from '../src/fixtures/home.js';
import {SERVICE_CATALOG} from '../src/ui/service-icons.js';
import {renderParticipationAdminSettings} from '../src/views/participation-pages.js';
test('home and catalog no longer expose retired services',()=>{const html=renderHomeLayout(HOME_FIXTURE);assert.doesNotMatch(html,/정참시민 전국 평가제|정참시 아카데미|정참시 키워드|data-layout-route="\/(academy|national-evaluation|keywords)/);assert.ok(!SERVICE_CATALOG.some(x=>['academy','evaluation','keywords'].includes(x.key)));assert.match(html,/나우|NOW|순위/);});
test('participation admin preserves polls and generation without retired menus',()=>{const html=renderParticipationAdminSettings({});assert.doesNotMatch(html,/nationalEvaluation|national-evaluation|정치키워드/);assert.match(html,/시티즌 초이스/);});
for(const [path,body]of [['politicians?keywords=1',null],['content?domain=academy',null],['content?domain=nationalEvaluation',null],['admin/keyword-rules',null],['admin/participation',{domain:'nationalEvaluation',operation:'create'}],['action',{action:'academy-apply',payload:{slotId:'old'}}],['action',{action:'vote',payload:{scope:'national:old::person',option:'positive'}}]])test('retired API rejects before any storage access: '+path,async()=>{let result;const res={setHeader(){},end(text){result=JSON.parse(text);},status(c){this.statusCode=c;return this;},json(data){result=data;return this;}};await handler({url:'/api/v3/'+path,method:body?'POST':'GET',headers:{host:'localhost'},body:body||{},query:{}},res);assert.equal(res.statusCode,410);assert.equal(result.error,'FEATURE_REMOVED');});

import {routeFromLocation} from '../src/core/navigation.js';
test('old clean and hash links resolve home',()=>{for(const feature of ['academy','national-evaluation','keywords']){assert.equal(routeFromLocation({hash:'#/'+feature,pathname:'/'}),'/');assert.equal(routeFromLocation({pathname:'/'+feature+'/old',search:'?q=old'}),'/');}});
