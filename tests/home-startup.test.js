import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {renderHomeLayout} from '../src/layout/home-layout.js';
import {HOME_FIXTURE} from '../src/fixtures/home.js';

test('a null optional banner cannot prevent the guest homepage from rendering',()=>{
 const markup=renderHomeLayout({...HOME_FIXTURE,homeBanner:null,session:{authenticated:false,user:null}});
 assert.match(markup,/class="main-column"/);
 assert.doesNotMatch(markup,/data-home-banner-edit/);
});

test('an administrator can register a banner when no banner is configured',()=>{
 const markup=renderHomeLayout({...HOME_FIXTURE,homeBanner:null,session:{authenticated:true,user:{id:'admin',role:'admin'}}});
 assert.match(markup,/data-home-banner-edit="sidebar"/);
 assert.match(markup,/data-home-banner-edit="hero"/);
});

const root=new URL('../',import.meta.url);
const entry=readFileSync(new URL('index.html',root),'utf8').match(/<script\s+type="module"\s+src="([^"]+)"/)[1];
for(const bannerState of ['empty','failed','configured']){
 test('the real index entry exits loading with '+bannerState+' banner response',()=>{
  const result=spawnSync(process.execPath,[new URL('helpers/home-startup.mjs',import.meta.url).pathname,new URL(entry.slice(1),root).href,bannerState],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.error?.message);
 });
}
