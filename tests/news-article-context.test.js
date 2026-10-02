import test from 'node:test';import assert from 'node:assert/strict';
import {extractArticleContext,readArticleContext,isAllowedArticleUrl} from '../lib/news-article-context.js';
import {classifyNewsIdentity} from '../lib/news-identity.js';
const person={id:'p1',name:'김민석',party:'더불어민주당',roleLabel:'국회의원'};
test('article reader extracts photo captions and article body, not scripts',()=>{
 const context=extractArticleContext('<html><script>secret navigation</script><article><p>김민석은 이재명 대통령과 정책을 논의했다.</p><figure><img><figcaption>김민석 더불어민주당 의원. 사진=연합뉴스</figcaption></figure></article></html>');
 assert.match(context.body,/정책/);assert.equal(context.captions.length,1);assert.doesNotMatch(context.body,/secret/);
});
test('a summary card before the main news article is not mistaken for its body',()=>{
 const context=extractArticleContext('<article class="story-summary">추천 요약</article><div class="story-news article"><div><p>김민석 본문</p></div><div class="caption-con"><p>김민석 국무총리</p></div></div><footer>추천 기사</footer>');
 assert.match(context.body,/김민석 본문/);assert.doesNotMatch(context.body,/추천/);assert.deepEqual(context.captions,['김민석 국무총리']);
});
test('unscoped recommendation captions are not attributed to the main article',()=>{
 const context=extractArticleContext('<main><p>김민석 정책 현장 방문</p></main><aside><figcaption>배우 김민석 새 드라마 출연</figcaption></aside>');
 assert.deepEqual(context.captions,[]);
});
test('streamed pages exceeding the read limit are cancelled',async()=>{
 let cancelled=false;
 const result=await readArticleContext({url:'https://www.khan.co.kr/article/123'},{fetchImpl:async()=>({ok:true,status:200,body:{getReader:()=>({read:async()=>({done:false,value:new Uint8Array(800001)}),cancel:async()=>{cancelled=true;}})}})});
 assert.equal(result.reason,'PAGE_TOO_LARGE');assert.equal(cancelled,true);
});
test('slow publisher reads stop at the configured timeout',async()=>{
 const result=await readArticleContext({url:'https://www.khan.co.kr/article/123'},{timeoutMs:100,fetchImpl:async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('abort')),{once:true}))});
 assert.equal(result.reason,'TIME_LIMIT');
});
test('caption identifies the subject; another politician alone is only supporting context',()=>{
 assert.equal(classifyNewsIdentity(person,{title:'김민석 현장 방문',captions:['김민석 더불어민주당 의원.']}).reason,'NAMED_POLITICAL_CAPTION');
 const result=classifyNewsIdentity(person,{title:'김민석, 이재명 언급',body:'이재명과 관련된 발언을 했다.'},{peers:[{id:'p2',name:'이재명'}]});
 assert.equal(result.status,'uncertain');assert.equal(result.reason,'POLITICAL_COMENTION');
 assert.equal(result.exclude,false);
});
test('redirects to local or unsupported URLs are never fetched',async()=>{
 for(const url of ['http://127.0.0.1','https://localhost','https://www.khan.co.kr.evil.test/a','https://www.khan.co.kr:444/a','https://u:p@www.khan.co.kr/a'])assert.equal(isAllowedArticleUrl(url),false,url);
 const calls=[];const result=await readArticleContext({url:'https://www.khan.co.kr/article/123'},{fetchImpl:async url=>{calls.push(url);return {status:302,headers:new Headers({location:'http://127.0.0.1/admin'})};}});
 assert.equal(calls.length,1);assert.equal(result.status,'unavailable');
});
test('inaccessible original pages leave the candidate available',async()=>{
 const context=await readArticleContext({url:'https://www.khan.co.kr/article/123'},{fetchImpl:async()=>({ok:false,status:403,headers:new Headers()})});
 assert.equal(context.status,'unavailable');assert.equal(classifyNewsIdentity(person,{title:'김민석 근황',...context}).exclude,false);
});
test('Google redirect resolution reaches a publisher and reads its caption',async()=>{
 const calls=[],fetchImpl=async(url,options)=>{calls.push(url);if(url.includes('batchexecute'))return {ok:true,status:200,headers:new Headers(),text:async()=>`)]}'\n\n${JSON.stringify([['wrb.fr','Fbv4je',JSON.stringify(['garturlres','https://www.khan.co.kr/article/123'])]])}`};
 if(url.includes('news.google.com'))return {ok:true,status:200,headers:new Headers(),text:async()=>'<div data-n-a-ts="1234" data-n-a-sg="signature"></div>'};
 return {ok:true,status:200,headers:new Headers(),text:async()=>'<article><figcaption>김민석 의원</figcaption><p>정책 논의</p></article>'};};
 const result=await readArticleContext({url:'https://news.google.com/rss/articles/ABC'},{fetchImpl});
 assert.equal(calls.length,3);assert.equal(result.status,'read');assert.match(result.captions[0],/김민석/);
});
