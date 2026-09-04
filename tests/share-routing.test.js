import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { routeFromLocation, shareableUrlForRoute } from '../src/core/navigation.js';

test('legacy hash routes and clean share routes resolve to the same application route',()=>{
  assert.equal(routeFromLocation({hash:'#/person/assembly-001',pathname:'/',search:''}),'/person/assembly-001');
  assert.equal(routeFromLocation({hash:'',pathname:'/person/assembly-001',search:''}),'/person/assembly-001');
  assert.equal(routeFromLocation({hash:'',pathname:'/compare',search:'?ids=a,b'}),'/compare?ids=a,b');
});

test('public share URLs always use the official domain and strip non-public compare parameters',()=>{
  assert.equal(shareableUrlForRoute('/person/assembly-001'),'https://www.jeongchamsi.com/person/assembly-001');
  assert.equal(shareableUrlForRoute('/compare?ids=a,b,c&admin=1'),'https://www.jeongchamsi.com/compare?ids=a%2Cb');
});

test('Vercel routes public clean URLs through the server metadata response before the SPA fallback',async()=>{
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  const pairs=config.rewrites.map(row=>`${row.source} -> ${row.destination}`);
  assert.ok(pairs.some(row=>row.includes('/person/:path* -> /api/share?path=person/:path*')));
  assert.ok(pairs.some(row=>row.includes('/column/:path* -> /api/share?path=column/:path*')));
  assert.ok(pairs.some(row=>row.includes('/compare -> /api/share?path=compare')));
  assert.equal(config.rewrites.at(-1).destination,'/index.html');
});

