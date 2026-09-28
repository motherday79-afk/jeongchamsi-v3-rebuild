// Feasibility probe: normal browser navigation, no challenge-token synthesis or TLS bypass.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {collectDocumentPolls} from '../lib/human-poll-document-collector.js';
const browser=await chromium.launch();
try{
 const context=await browser.newContext(),page=await context.newPage();
 const browserFetch=async(raw,options={})=>{
  const url=new URL(raw);
  if(!['nbsurvey.kr','www.nbsurvey.kr'].includes(url.hostname))throw Error('NBS_ONLY');
  if(url.pathname==='/files'){
   await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:20000});
   await page.locator(url.search?'[onclick*="sendBoardFileData"]':'a[href*="files?vid="]').first().waitFor({timeout:20000});
   return new Response(await page.content(),{headers:{'content-type':'text/html; charset=utf-8'}});
  }
  const response=await context.request.fetch(url.href,{method:options.method||'GET',data:options.body?.toString(),headers:options.body?{'Content-Type':'application/x-www-form-urlencoded'}:undefined,maxRedirects:0,timeout:15000});
  return new Response(await response.body(),{status:response.status(),headers:response.headers()});
 };
 const result=await collectDocumentPolls({fetch:browserFetch,providerIds:['nbs']});
 await writeFile('nbs-browser-output.json',JSON.stringify(result));
 console.log('NBS_BROWSER',JSON.stringify(result.providers));
 console.log('NBS_ITEMS',JSON.stringify(result.items.map(p=>({date:p.publishedDate,overall:p.results.overall,ageRows:Object.keys(p.results.age).length,url:p.sourceUrl}))));
 if(!result.items.length)process.exitCode=1;
}finally{await browser.close();}
