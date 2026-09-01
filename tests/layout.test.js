import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('layout uses only local production assets and no legacy production origin',()=>{
  const html=read('index.html');
  assert.match(html,/\/css\/app\.css/);
  assert.match(html,/\/src\/app\.js/);
  assert.doesNotMatch(html,/jeongchamsi-v3-preview-clean|https:\/\/.*vercel\.app/);
});

test('new app contains no legacy API, Redis, repository or refresh engine imports',()=>{
  const app=read('src/app.js');
  const home=read('src/layout/home-layout.js');
  const all=app+'\n'+home;
  assert.doesNotMatch(all,/\/api\/|redis|repository\.js|refresh|history-repository|getHomeSnapshot|getNowPublic/i);
});

test('home preserves current production section order',()=>{
  const home=read('src/layout/home-layout.js');
  const markers=['product-hero','product-launcher','itsme-home-module','poll-module','national-eval','generation-president','id="compare"','now-module','id="column"','id="community"','academy-module'];
  let pos=-1;
  for(const marker of markers){
    const next=home.indexOf(marker);
    assert.ok(next>pos, `${marker} must appear in production order`);
    pos=next;
  }
});

test('existing vector icon path definitions are present locally',()=>{
  const icons=read('src/ui/service-icons.js');
  for(const key of ['now','poll','itsme','compare','generation','community']) assert.match(icons,new RegExp(`${key}:`));
  assert.match(icons,/M4 17 9 12l3 3 8-9/);
  assert.match(icons,/viewBox="0 0 24 24"/);
});

test('layout foundation has new UI behavior wiring rather than disabled controls',()=>{
  const ui=read('src/ui/interactions.js');
  assert.match(ui,/setupDrawer/);
  assert.match(ui,/setupNowCarousel/);
  assert.match(ui,/setupLayoutNavigation/);
  assert.doesNotMatch(ui,/pointer-events\s*:\s*none|disabled\s*=\s*true/);
});
