import test from 'node:test';
import assert from 'node:assert/strict';
import {createMockBillSettings} from '../lib/mock-bill-settings.js';
import {renderMockBillPage} from '../src/views/mock-bill.js';
import {renderBillSettings} from '../src/ui/mock-bill-settings.js';
import {canAccessAdminEndpoint} from '../src/core/membership.js';
test('saved introduction survives a fresh service and renders as text, including empty text',async()=>{const db=new Map(),command=async([op,key,value])=>op==='GET'?db.get(key):db.set(key,value);const service=createMockBillSettings({command});await service.save({introduction:'<script>alert(1)</script>\n소개'});const saved=await createMockBillSettings({command}).get();assert.equal(saved.introduction,'<script>alert(1)</script>\n소개');assert.ok(renderMockBillPage(saved).includes('&lt;script&gt;'));assert.ok(renderBillSettings(saved).includes('&lt;script&gt;'));await service.save({introduction:''});assert.equal((await service.get()).introduction,'');await assert.rejects(service.save({introduction:'x'.repeat(3001)}));});
test('removed PDF and party explanations stay absent; ordinary users cannot edit',()=>{const html=renderMockBillPage();assert.doesNotMatch(html,/PDF 원문|제안서 원문|판단 이유|bill-party-explain|<details class="bill-party"/);assert.equal(canAccessAdminEndpoint({id:'member',role:'user'},'admin/mock-bill-settings'),false);});
