import {renderMediaSpread,spreadEsc as esc,spreadRoute} from './media-spread-view.js?v=0.0.31.148';
const snapshots=new WeakMap();
const keyOf=params=>JSON.stringify([params.query,params.personId||'',params.publisher||'',params.period==='cumulative'?'cumulative':'latest']);
export function hasSearchSnapshot(content,term){return [...(snapshots.get(content)?.values()||[])].some(row=>row.query===String(term).trim()&&Date.now()-row.at<120000);}
async function searchSnapshot(params,politicians,content){
 let cache=snapshots.get(content);if(!cache){cache=new Map();snapshots.set(content,cache);}const key=keyOf(params),old=cache.get(key);if(old&&Date.now()-old.at<120000)return old.promise;
 const entry={at:Date.now(),query:params.query};entry.promise=politicians.mediaSpread(params).then(result=>{if(result?.ok!==true)throw new Error('SEARCH_LOAD_FAILED');return result;}).catch(error=>{cache.delete(key);throw error;});cache.set(key,entry);while(cache.size>12)cache.delete(cache.keys().next().value);return entry.promise;
}
async function matchingPosts(query,content){
 const groups=await Promise.all([['IT’S ME','itsme'],['COLUMN','columns'],['정뮤니티','community']].map(async([label,domain])=>{
  const items=await content.list(domain),found=(Array.isArray(items)?items:[]).filter(item=>item.published!==false&&[item.title,item.summary,item.body,item.author].some(value=>String(value||'').toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR'))));
  if(!found.length)return '';
  return `<section class="content-card search-group"><div class="section-title"><h2>${label}</h2><span>${found.length}건</span></div><div class="search-content-list">${found.slice(0,10).map(item=>{const route=`/${domain==='columns'?'column':domain}/${encodeURIComponent(item.id)}`;return `<a href="${esc(route)}" data-layout-route="${esc(route)}"><b>${esc(item.title)}</b><p>${esc(item.summary||String(item.body||'').slice(0,140))}</p></a>`;}).join('')}</div></section>`;
 }));return groups.join('');
}
export async function renderSearchPage({query='',page=1,personId='',publisher='',period='latest',politicians,content}={}){
 const term=String(query||'').trim(),params={query:term,personId,publisher,period:period==='cumulative'?'cumulative':'latest',page};
 const hero=`<header class="spread-intro"><span class="spread-kicker">JCS SPREAD</span><h1>정참 시선</h1><p>정치인을 검색하고, 언론이 누구를 어떻게 다루는지 살펴보세요.</p></header>`;
 if(!term)return `<main class="subpage search-page jcs-spread">${hero}</main>`;
 try{
  const data=await searchSnapshot(params,politicians,content);
  if(data.matches.length||data.target.kind!=='none')return `<main class="subpage search-page jcs-spread" data-search-query="${esc(term)}">${renderMediaSpread(data,params)}</main>`;
  const posts=await matchingPosts(term,content);
  return `<main class="subpage search-page jcs-spread" data-search-query="${esc(term)}">${hero}<p class="spread-query">‘${esc(term)}’ 검색 결과</p>${posts||'<div class="content-card spread-empty"><h2>일치하는 결과가 없습니다</h2><p>정치인 이름이나 정당 이름으로 다시 검색해 주세요.</p></div>'}</main>`;
 }catch{
  const retry=spreadRoute(params);return `<main class="subpage search-page jcs-spread" data-search-query="${esc(term)}">${hero}<div class="content-card spread-empty" role="status"><h2>검색 결과를 불러오지 못했습니다</h2><p>잠시 후 다시 시도해 주세요.</p><a href="${esc(retry)}" data-layout-route="${esc(retry)}">다시 불러오기</a></div></main>`;
 }
}
