import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const compact=value=>value.replace(/\s+/g,'');

test('31.33 compact home stylesheet loads last and keeps six generation cards horizontal',()=>{
  const html=read('index.html'),css=compact(read('css/hotfix-31-33-home-admin-storage.css'));
  assert.ok(html.indexOf('hotfix-31-33-home-admin-storage.css')>html.indexOf('hotfix-31-32-mypage-diagnostics-photo.css'));
  assert.match(css,/#generation-president\.generation-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*#generation-president\.generation-grid\{display:flex;[^}]*overflow-x:auto/);
  assert.match(css,/#community\.community-row\{min-height:44px/);
  assert.match(css,/#poll\.poll-optionsbutton\{min-height:58px/);
});

test('administrator source no longer exposes automatic YouTube or manual approval controls',()=>{
  const app=read('src/app.js'),admin=read('src/views/stage1.js');
  assert.doesNotMatch(`${app}\n${admin}`,/data-youtube-discovery|runYouTubeDiscovery|data-youtube-rediscover/);
  assert.doesNotMatch(`${app}\n${admin}`,/data-intelligence-approve|data-person-approve/);
  assert.match(admin,/data-youtube-channel-form/);
  assert.match(admin,/자동 검증을 통과한 수집본/);
});

test('banner endpoint reports the fixed two megabyte 640 by 350 contract',()=>{
  const gateway=read('api/gateway.js');
  assert.match(gateway,/maxBytes:2_097_152/);
  assert.match(gateway,/recommended:\{width:640,height:350\}/);
  assert.match(gateway,/homeBannerStorageStatus\(process\.env\)/);
});

