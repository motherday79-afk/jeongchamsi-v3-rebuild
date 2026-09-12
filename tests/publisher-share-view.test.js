import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMediaIndex} from '../lib/media-spread.js';
import {renderMediaSpread} from '../src/views/media-spread-view.js';

const now=Date.parse('2026-09-12T12:00:00Z');
const people=[{id:'target',name:'김대상',party:'함께당'},{id:'peer',name:'이동료',party:'새로운당'}];
const makeRows=(source,count,id)=>Array.from({length:count},(_,i)=>({title:`공개 기사 ${i}`,people:[id],source,stamp:now-86400000,timed:true,url:`https://news.example/${encodeURIComponent(source)}/${id}/${i}`}));
function data(){return analyzeMediaIndex({people,articles:[...makeRows('연합뉴스',20,'target'),...makeRows('연합뉴스',80,'peer'),...makeRows('동아일보',10,'target'),...makeRows('동아일보',190,'peer')],publishers:['연합뉴스','동아일보'],issues:[],coverage:{target:{legacy:true,truncated:true}}},{personId:'target',publisher:'연합뉴스',period:'cumulative',now});}
const load=()=>import('../src/views/publisher-share-view.js').catch(()=>({}));

test('publisher share appears inside publisher focus with two labeled bars, exact fractions and source count',()=>{
 const result=data(),html=renderMediaSpread(result,{query:'김대상',personId:'target'});
 const detail=html.indexOf('class="spread-publisher-detail"'),share=html.indexOf('class="publisher-share"'),existingAnalysis=html.indexOf('class="spread-analysis-grid"');
 assert.ok(detail>=0&&share>detail&&existingAnalysis>share,'share belongs within publisher detail ahead of the existing analysis');
 const block=html.slice(share,existingAnalysis);
 assert.match(block,/보도 비중의 차이/);
 assert.match(block,/다른 언론 합산/);
 assert.match(block,/20\s*\/\s*100건/);
 assert.match(block,/10\s*\/\s*200건/);
 assert.match(block,/20%/);assert.match(block,/5%/);assert.match(block,/15%p/);assert.match(block,/4배/);
 assert.match(block,/1개 언론사/);
 assert.match(block,/aria-label="연합뉴스[^"\n]*20%/);
 assert.match(block,/aria-label="다른 언론 합산[^"\n]*5%/);
 assert.match(block,/width:20%/);assert.match(block,/width:5%/);
});

test('peer navigation retains the selected publisher and thirty day period',async()=>{
 const {renderPublisherShare}=await load();assert.equal(typeof renderPublisherShare,'function');
 const result=data(),html=renderPublisherShare(result.selected.shareComparison,{period:result.period,coverage:result.coverage});
 const links=[...html.matchAll(/data-layout-route="([^"]+)"/g)].map(match=>new URL(match[1].replaceAll('&amp;','&'),'https://local.example'));
 assert.equal(links.length,1);
 assert.equal(links[0].pathname,'/search');
 assert.equal(links[0].searchParams.get('q'),'이동료');
 assert.equal(links[0].searchParams.get('person'),'peer');
 assert.equal(links[0].searchParams.get('publisher'),'연합뉴스');
 assert.equal(links[0].searchParams.get('period'),'cumulative');
});

test('share basis discloses indexed population, article counting, excluded publisher, collection limits and bounded evidence',async()=>{
 const {renderPublisherShare}=await load();assert.equal(typeof renderPublisherShare,'function');
 const result=data(),html=renderPublisherShare(result.selected.shareComparison,{period:result.period,coverage:result.coverage});
 assert.match(html,/<details class="publisher-share-basis">/);
 assert.match(html,/등록 정치인 2명/);
 assert.match(html,/모든 정치 기사/);
 assert.match(html,/제외/);
 assert.match(html,/한 번/);
 assert.match(html,/누락/);assert.match(html,/제한/);
 assert.match(html,/이전 수집/);
 assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g)||[]).length,6);
 assert.doesNotMatch(html,/평균 언론|편향 점수|통계적으로 유의/);
});

test('small samples show counts and percentages with a note while zero baseline never becomes a ratio',async()=>{
 const {renderPublisherShare}=await load();assert.equal(typeof renderPublisherShare,'function');
 const index={people,articles:[...makeRows('연합뉴스',1,'target'),...makeRows('동아일보',1,'peer')],publishers:['연합뉴스','동아일보'],issues:[],coverage:{}};
 const result=analyzeMediaIndex(index,{personId:'target',publisher:'연합뉴스',now});
 const html=renderPublisherShare(result.selected.shareComparison);
 assert.match(html,/1\s*\/\s*1건/);assert.match(html,/0\s*\/\s*1건/);assert.match(html,/100%/);assert.match(html,/>0%</);
 assert.match(html,/적은 수집 표본/);
 assert.doesNotMatch(html,/publisher-share-ratio|Infinity|NaN/);
});

test('missing comparison denominators or a missing target render no share panel',async()=>{
 const {renderPublisherShare}=await load();assert.equal(typeof renderPublisherShare,'function');
 assert.equal(renderPublisherShare(null),'');
 assert.equal(renderPublisherShare({...data().selected.shareComparison,target:null}),'');
 const result=data().selected.shareComparison;
 assert.equal(renderPublisherShare({...result,target:{...result.target,other:{count:0,total:0,share:0}}}),'');
});

test('publisher, target and evidence text are escaped and unsafe article links remain plain text',async()=>{
 const {renderPublisherShare}=await load();assert.equal(typeof renderPublisherShare,'function');
 const result=data().selected.shareComparison;
 result.publisher='<img src=x onerror=alert(1)>';
 result.target.name='<script>alert(1)</script>';
 result.target.evidence={selected:[{title:'<b>위험 기사</b>',source:'<img>',date:'bad date',url:'javascript:alert(1)'},{title:'깨진 주소',source:'공개언론',date:'',url:'https://'},{title:'외부 근거',source:'공개언론',date:'2026-09-11T12:00:00Z',url:'https://news.example/?x=1&y=2'}],other:[]};
 const html=renderPublisherShare(result);
 assert.doesNotMatch(html,/<script>|<img|javascript:|href="https:\/\/"/);
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;b&gt;위험 기사&lt;\/b&gt;/);
 assert.match(html,/href="https:\/\/news.example\/\?x=1&amp;y=2"/);
 assert.match(html,/rel="noopener noreferrer"/);
});

test('positive shares and ratios below display precision never appear as observed zero',async()=>{
 const {renderPublisherShare}=await load();assert.equal(typeof renderPublisherShare,'function');
 const result=data().selected.shareComparison;
 result.target={...result.target,selected:{count:5,total:10000,share:.05},other:{count:5,total:20,share:25},differencePp:-24.95,ratio:.002,sampleLimited:false};
 result.higher=[];result.lower=[];
 const html=renderPublisherShare(result);
 assert.match(html,/0.1% 미만/);
 assert.match(html,/0.1배 미만/);
 assert.match(html,/5 \/ 10,000건/);
 assert.doesNotMatch(html,/>0%<|비중 0배/);
});
