import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMediaIndex,buildMediaIndex} from '../lib/media-spread.js';

const now=Date.parse('2026-09-12T12:00:00Z'),day=86400000;
const people=[{id:'target',name:'김대상',party:'함께당'},{id:'peer',name:'이동료',party:'함께당'},{id:'rest',name:'박다른',party:'새로운당'}];
const row=(source,ids=['rest'],age=1,extra={})=>({title:'공개 수집 기사',source,people:ids,stamp:now-age*day,timed:true,url:'',...extra});
const rows=(source,count,ids)=>Array.from({length:count},()=>row(source,ids));
const index=(articles,profiles=people)=>({people:profiles,articles,publishers:[...new Set(articles.map(x=>x.source).filter(Boolean))],issues:[],coverage:{}});
const analyze=(articles,options={},profiles=people)=>analyzeMediaIndex(index(articles,profiles),{personId:'target',publisher:'연합뉴스',now,...options}).selected.shareComparison;

test('share excludes the chosen publisher from the pooled baseline and retains exact observed fractions',()=>{
 const result=analyze([...rows('연합뉴스',20,['target']),...rows('연합뉴스',80),...rows('동아일보',5,['target']),...rows('동아일보',95),...rows('뉴스1',5,['target']),...rows('뉴스1',95)]);
 assert.ok(result,'the selected publisher includes its share comparison');
 assert.deepEqual(result.target.selected,{count:20,total:100,share:20});
 assert.deepEqual(result.target.other,{count:10,total:200,share:5});
 assert.equal(result.target.differencePp,15);
 assert.equal(result.target.ratio,4);
 assert.equal(result.target.sampleLimited,false);
 assert.equal(result.otherPublisherCount,2);
 assert.equal(result.populationCount,3);
});

test('both sides use the same rolling seven or thirty day window including boundaries',()=>{
 const articles=[row('연합뉴스',['target'],7),row('동아일보',['rest'],0),row('연합뉴스',['rest'],7.01),row('동아일보',['target'],30),row('연합뉴스',['target'],30.01),row('동아일보',['target'],-1)];
 const week=analyze(articles),month=analyze(articles,{period:'cumulative'});
 assert.ok(week);assert.ok(month);
 assert.deepEqual(week.target.selected,{count:1,total:1,share:100});
 assert.deepEqual(week.target.other,{count:0,total:1,share:0});
 assert.deepEqual(month.target.selected,{count:1,total:2,share:50});
 assert.deepEqual(month.target.other,{count:1,total:2,share:50});
});

test('indexed URL and party deduplication count a multi-person article once on each side',()=>{
 const item=(title,source,url)=>({title,source,url,publishedAt:'2026-09-11T10:00:00Z'});
 const shared=item('김대상 이동료 철도 개편','연합뉴스','https://news.example/shared');
 const other=item('김대상 이동료 주택 계획','동아일보','https://news.example/other');
 const draft=(id,items)=>({id,input:{news:{items,evidenceItems:items,mediaCorpusVersion:1}}});
 const built=buildMediaIndex([draft('target',[shared,{...shared,title:'김대상 이동료 철도 개편 확정'},other]),draft('peer',[shared,other]),draft('rest',[item('박다른 재정 계획','연합뉴스','https://news.example/rest')])],people);
 const result=analyzeMediaIndex(built,{query:'함께당',publisher:'연합뉴스',now}).selected.shareComparison;
 assert.ok(result);
 assert.equal(result.target.kind,'party');
 assert.deepEqual(result.target.selected,{count:1,total:2,share:50});
 assert.deepEqual(result.target.other,{count:1,total:1,share:100});
 assert(![...result.higher,...result.lower].some(x=>x.id==='target'||x.id==='peer'));
 assert.equal(result.target.evidence.selected.length,1);
});

test('unattributed articles and rows outside the registered population never enter either denominator',()=>{
 const result=analyze([row('연합뉴스',['target','target']),row('동아일보',['rest']),row('',['target']),row('',['rest']),row('연합뉴스',['removed']),row('별도언론',['removed'])]);
 assert.ok(result);
 assert.deepEqual(result.target.selected,{count:1,total:1,share:100});
 assert.deepEqual(result.target.other,{count:0,total:1,share:0});
 assert.equal(result.otherPublisherCount,1);
 assert.equal(result.unattributedCount,2);
});

test('zero baseline target share remains a real zero without a ratio',()=>{
 const result=analyze([...rows('연합뉴스',5,['target']),...rows('연합뉴스',15),...rows('동아일보',20)]);
 assert.ok(result);
 assert.equal(result.target.other.share,0);
 assert.equal(result.target.differencePp,25);
 assert.equal(result.target.ratio,null);
 assert.equal(result.target.sampleLimited,true);
});

test('ratio requires twenty denominator articles and five target articles on both sides',()=>{
 for(const [chosenTotal,otherTotal,chosenCount,otherCount,ratio] of [[20,20,5,5,1],[19,20,5,5,null],[20,19,5,5,null],[20,20,4,5,null],[20,20,5,4,null]]){
  const result=analyze([...rows('연합뉴스',chosenCount,['target']),...rows('연합뉴스',chosenTotal-chosenCount),...rows('동아일보',otherCount,['target']),...rows('동아일보',otherTotal-otherCount)]);
  assert.ok(result);
  assert.equal(result.target.ratio,ratio,`${chosenCount}/${chosenTotal} versus ${otherCount}/${otherTotal}`);
  assert.equal(result.target.sampleLimited,ratio===null);
 }
});

test('no valid target or no articles on either comparison side suppresses the panel data',()=>{
 const articles=[row('연합뉴스',['target']),row('동아일보',['rest'])];
 assert.equal(analyze(articles,{personId:'',query:'미등록'}),null);
 assert.equal(analyze(rows('연합뉴스',2,['target'])),null);
 const emptyChosen=index(articles);emptyChosen.publishers.push('저장언론');
 assert.equal(analyzeMediaIndex(emptyChosen,{personId:'target',publisher:'저장언론',now}).selected.shareComparison,null);
});

test('peer lists rank percentage-point gaps, exclude the target, and cap each direction at three',()=>{
 const peers=Array.from({length:8},(_,i)=>({id:`p${i}`,name:`비교인물${i}`}));
 const profiles=[...people,...peers];
 const selected=Array.from({length:200},(_,i)=>row('연합뉴스',['rest',...(i<5?['target']:[]),...peers.filter((p,n)=>i<[60,5,30,20,10,10,5,0][n]).map(p=>p.id)]));
 const other=Array.from({length:200},(_,i)=>row('동아일보',['rest',...(i<5?['target']:[]),...peers.filter((p,n)=>i<[40,0,20,15,20,30,35,40][n]).map(p=>p.id)]));
 const result=analyze([...selected,...other],{},profiles);
 assert.ok(result);
 assert.deepEqual(result.higher.map(x=>x.id),['p0','p2','p1']);
 assert.deepEqual(result.lower.map(x=>x.id),['p7','p6','p5']);
 assert.equal(result.higher[0].differencePp,10);
 assert.equal(result.higher[2].ratio,null);
 assert(![...result.higher,...result.lower].some(x=>x.id==='target'));
});

test('bounded evidence includes only relevant published rows, with recent dates and safe HTTP(S) links',()=>{
 const articles=[row('연합뉴스',['target'],0,{title:'위험 링크',url:'javascript:alert(1)'}),row('연합뉴스',['target'],1,{title:'최근 기사',url:'https://news.example/latest?x=1&y=2'}),row('연합뉴스',['target'],2,{title:'오류 링크',url:'https://'}),row('연합뉴스',['target'],3,{title:'한도 밖 기사',url:'https://news.example/older'}),row('연합뉴스',['rest'],0,{title:'대상 아님'}),row('동아일보',['target'],1,{url:'http://news.example/other'}),row('',['target'],0,{title:'원언론사 미확인 기사'})];
 const result=analyze(articles);
 assert.ok(result);
 assert.equal(result.target.evidence.selected.length,3);
 assert.deepEqual(result.target.evidence.selected.map(x=>x.title),['위험 링크','최근 기사','오류 링크']);
 assert.equal(result.target.evidence.selected[0].url,'');
 assert.equal(result.target.evidence.selected[1].url,'https://news.example/latest?x=1&y=2');
 assert.equal(result.target.evidence.selected[2].url,'');
 assert.equal(result.target.evidence.other[0].url,'http://news.example/other');
 assert.equal(result.target.evidence.selected[0].date,'2026-09-12T12:00:00.000Z');
 assert(!JSON.stringify(result.target.evidence).includes('대상 아님'));
});
