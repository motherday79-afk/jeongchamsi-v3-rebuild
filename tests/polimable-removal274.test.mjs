import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import layoutHandler from '../api/polimable-hud-layout.js';
import {renderHomeLayout} from '../src/layout/home-layout.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('desktop/mobile shared home has no game entry even when old game data is present',()=>{
 const html=renderHomeLayout({polimableToday:{entries:[{initials:'JCS',score:100}]}});
 assert.doesNotMatch(html,/polimable|polimarble|폴리마블|GAME START/i);
 assert.match(html,/side-column/);
});
test('removed game is not imported, bound, or requested during app startup',()=>{
 const app=read('src/app.js'),html=read('index.html');
 assert.doesNotMatch(app,/createPoliMarbleClient|renderPoliMarblePage|bindPoliMarble|hydratePoliMarble|polimable\.leaderboard/);
 assert.doesNotMatch(html,/polimable/i);
 assert.match(app,/if\(p\[0\]==='polimable'\|\|p\[0\]==='polimarble'\)\{location.replace\('\/'\);return;\}/);
});
test('direct legacy URLs redirect to home and game gateway exits before Redis',()=>{
 const config=JSON.parse(read('vercel.json'));
 for(const name of ['polimable','polimarble'])assert.ok(config.redirects.some(r=>r.source===`/${name}/:path*`&&r.destination==='/'));
 const gateway=read('api/gateway.js'),start=gateway.indexOf('export default async function handler');
 assert.ok(gateway.indexOf("error:'FEATURE_REMOVED'",start)<gateway.indexOf('const command=rebuildRedisCommand()',start));
 assert.doesNotMatch(gateway,/createPoliMarbleService|handlePolimable/);
});
test('old layout endpoint refuses reads and writes without accessing stored layouts',()=>{
 for(const method of ['GET','POST','PUT','PATCH','DELETE']){let body;const res={setHeader(){},end(v){body=JSON.parse(v);}};layoutHandler({method},res);assert.equal(res.statusCode,410);assert.equal(body.error,'FEATURE_REMOVED');}
});
