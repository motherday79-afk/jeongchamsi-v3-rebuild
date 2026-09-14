import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CAMPAIGN_EXAMPLES } from '../src/data/campaign-examples.js';
import { renderCampaignDetail, renderCampaignBoard } from '../src/views/campaign-pages.js';
import { renderCampaignEditor } from '../src/views/campaign-editor.js';

const admin={authenticated:true,user:{role:'admin'}};
test('approved featured portrait and four atlas card crops retain their intended mapping',()=>{
 assert.deepEqual(CAMPAIGN_EXAMPLES.map(row=>[row.id,row.published.photoUrl,row.published.photoCrop]),[
  ['example-001','/assets/campaigns/approved-campaign-1.webp',''],
  ['example-002','/assets/campaigns/approved-campaign-0.webp','atlas-tl'],
  ['example-003','/assets/campaigns/approved-campaign-0.webp','atlas-tr'],
  ['example-004','/assets/campaigns/approved-campaign-0.webp','atlas-bl'],
  ['example-005','/assets/campaigns/approved-campaign-0.webp','atlas-br']
 ]);
 const featured=renderCampaignBoard({ok:true,featured:{...CAMPAIGN_EXAMPLES[0].published,...CAMPAIGN_EXAMPLES[0],state:'current'},items:[],counts:{current:1,archive:0}});
 assert.match(featured,/<div class="jcd-feature-photo"><img[^>]+approved-campaign-1\.webp/);assert.doesNotMatch(featured,/jcd-feature-photo"><svg/);
 for(const row of CAMPAIGN_EXAMPLES.slice(1)){const html=renderCampaignDetail({...row.published,...row,state:'current'});assert.match(html,new RegExp(`<svg class="campaign-crop ${row.published.photoCrop}"`));}
});

test('inline crop surfaces follow retained feature, detail, grid and editor sizing contracts',async()=>{
 const campaignCss=await readFile(new URL('../css/campaigns-158.css',import.meta.url),'utf8'),editorCss=await readFile(new URL('../css/campaign-editor-158.css',import.meta.url),'utf8');
 assert.match(campaignCss,/\.jcd-feature-photo>\.campaign-crop[\s\S]*\.jcs-photo>\.campaign-crop\{[^}]*inset:0;position:absolute/);
 assert.match(campaignCss,/\.jcd-portrait>\.campaign-crop\{[^}]*height:100%;inset:0;position:absolute;width:100%/);
 assert.match(editorCss,/\[data-campaign-photo-preview\]>\.campaign-crop\{[^}]*border-radius:14px[^}]*max-height:220px[^}]*max-width:180px/);
 const editor=renderCampaignEditor(CAMPAIGN_EXAMPLES[1],admin);assert.match(editor,/data-campaign-photo-preview[^]*<svg class="campaign-crop atlas-tl"/);
});
