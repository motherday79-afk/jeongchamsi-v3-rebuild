import test from 'node:test';
import assert from 'node:assert/strict';
import {renderHomeLayout} from '../src/layout/home-layout.js';
import {HOME_FIXTURE} from '../src/fixtures/home.js';
import {setupLayoutNavigation} from '../src/ui/interactions.js';
import {loadCampaignPage} from '../src/core/campaign-routing.js';
import {createCampaignService} from '../lib/campaign-service.js';

const legacy={url:'https://images.fixture.invalid/old-sidebar.png',targetUrl:'https://www.youtube.com/@old',alt:'정참시유튜브'};
const sidebar=(banner,session={})=>renderHomeLayout({...HOME_FIXTURE,homeBanner:banner,session}).match(/<section class="side-card side-home-banner\b[^]*?<\/section>/)?.[0]||'';
const uploaded={...legacy,designVersion:'upload',mobileUrl:'https://images.fixture.invalid/mobile.webp',tabletUrl:'https://images.fixture.invalid/tablet.webp'};

test('the existing legacy sidebar becomes the approved campaign with a whole-image internal link',()=>{
 const html=sidebar(legacy);
 assert.match(html,/href="\/campaigns\/example-002" data-layout-route="\/campaigns\/example-002"/);
 assert.match(html,/campaign-night-transit-pc-170.webp/);
 assert.match(html,/예시 캠페인.*한도윤.*늦은 귀갓길에도/);
 assert.equal((html.match(/<a\b/g)||[]).length,1);
 assert.doesNotMatch(html,/youtube|old-sidebar|target="_blank"/);
});

test('an unavailable banner record still renders the approved local campaign and admin editing',()=>{
 for(const state of [null,undefined,{}]){
  assert.match(sidebar(state),/campaign-night-transit-pc-170.webp/);
  assert.doesNotMatch(sidebar(state),/data-home-banner-edit/);
  assert.match(sidebar(state,{user:{role:'admin'}}),/data-home-banner-edit="sidebar"/);
 }
});

test('picture sources match the existing mobile and unfolded Fold slot ratios',()=>{
 const html=sidebar(legacy);
 assert.match(html,/<source media="\(min-width:601px\) and \(max-width:1024px\)" srcset="\/assets\/banners\/campaign-night-transit-tablet-170.webp"/);
 assert.match(html,/<source media="\(max-width:600px\)" srcset="\/assets\/banners\/campaign-night-transit-mobile-170.webp"/);
 assert.match(html,/srcset="\/assets\/banners\/campaign-night-transit-pc-170.webp 1x, \/assets\/banners\/campaign-night-transit-pc-2x-170.webp 2x"/);
});

test('new administrator uploads keep their artwork and external destination',()=>{
 const html=sidebar(uploaded,{user:{role:'admin'}});
 for(const value of [uploaded.url,uploaded.mobileUrl,uploaded.tabletUrl,uploaded.targetUrl])assert.ok(html.includes(value));
 assert.match(html,/target="_blank" rel="noopener noreferrer"/);
 assert.match(html,/data-home-banner-edit="sidebar"/);
 assert.doesNotMatch(html,/campaign-night-transit|data-layout-route/);
});

test('uploaded campaign URLs use internal navigation only for the verified site hosts',()=>{
 for(const targetUrl of ['/campaigns/example-002','https://www.jeongchamsi.com/campaigns/example-002','https://jeongchamsi.com/campaigns/example-002']){
  assert.match(sidebar({...uploaded,targetUrl}),/data-layout-route="\/campaigns\/example-002"/);
 }
 const external=sidebar({...uploaded,targetUrl:'https://www.jeongchamsi.com.evil.invalid/campaigns/example-002'});
 assert.doesNotMatch(external,/data-layout-route/);
 assert.match(external,/target="_blank"/);
});

test('campaign clicks use the existing route event and open the real bundled example detail',async t=>{
 const html=sidebar(legacy),route=html.match(/data-layout-route="([^"]+)"/)?.[1];
 assert.equal(route,'/campaigns/example-002');
 const events=[],handlers={};
 const priorWindow=globalThis.window,priorEvent=globalThis.CustomEvent;
 t.after(()=>{globalThis.window=priorWindow;globalThis.CustomEvent=priorEvent;});
 globalThis.window={dispatchEvent:event=>events.push(event)};
 globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail;}};
 const link={dataset:{layoutRoute:route},setAttribute(){}};
 const root={querySelectorAll:()=>[link],querySelector:()=>null,addEventListener:(type,fn)=>handlers[type]=fn};
 setupLayoutNavigation(root);
 let prevented=false;
 handlers.click({preventDefault(){prevented=true;},target:{closest:selector=>selector==='[data-layout-route]'?link:null}});
 assert.ok(prevented);
 assert.deepEqual(events.map(event=>[event.type,event.detail.route]),[['jcs:layout-route',route]]);
 const service=createCampaignService({command:async()=>null});
 const detail=await loadCampaignPage({parts:route.slice(1).split('/'),client:{get:id=>service.get(id,null)}});
 assert.match(detail,/한도윤/);
 assert.match(detail,/늦은 귀갓길에도/);
 assert.match(detail,/멈추지 않는 이동을/);
 assert.match(detail,/예시/);
});

test('the legacy hero continues to show its current artwork and destination',()=>{
 const html=renderHomeLayout({...HOME_FIXTURE,homeBanner:{...legacy,hero:{...legacy,targetUrl:'https://www.ihsnews.com/'}}});
 const hero=html.match(/<section class="home-wide-banner"[^]*?<\/section>/)?.[0]||'';
 assert.match(hero,/\/assets\/banners\/hero-pc-117.webp/);
 assert.match(hero,/href="https:\/\/www.ihsnews.com\/" target="_blank"/);
 assert.doesNotMatch(hero,/campaign-night-transit|data-layout-route/);
});
