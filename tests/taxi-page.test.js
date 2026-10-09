import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {taxiPage} from '../lib/taxi-page.js';
import {formatDistance} from '../taxi/distance.js';
test('taxi entry points admit guests and active members but reject suspended accounts',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url)));
 for(const source of ['/mine','/mine/ad','/mine/'])assert.equal(config.rewrites.find(r=>r.source===source)?.destination,'/api/gateway?path=taxi-page');
 for(const source of ['/taxi','/taxi/','/taxi/index.html'])assert.equal(config.redirects.find(r=>r.source===source)?.destination,'/mine');
 for(const user of [{id:'a',role:'admin',status:'suspended'}]){const result=taxiPage(user);assert.equal(result.status,user?403:401);assert.doesNotMatch(result.html,/id="scene"|taxi\/app.js/);}
 for(const user of [null,{id:'member',role:'member',status:'active'},{id:'staff',role:'admin',status:'active'}]){const result=taxiPage(user);assert.equal(result.status,200);assert.match(result.html,/id="ride-reset"/);}
});
test('distance changes units exactly at one kilometer and uses one decimal',()=>{
 for(const [n,value,unit] of [[0,'0','M'],[850,'850','M'],[999.9,'999','M'],[1000,'1.0','KM'],[1100,'1.1','KM'],[2000,'2.0','KM']])assert.deepEqual(formatDistance(n),{value,unit});
});
