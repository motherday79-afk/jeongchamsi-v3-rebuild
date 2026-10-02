import {fetchGoogleNews} from './google-news.js';
export const articleCandidatesKey=id=>`jcs:v3:article-candidates:${encodeURIComponent(id)}`;
export function createArticleCandidates({command,collector=fetchGoogleNews,now=Date.now}={}){
 async function read(id){const raw=await command(['GET',articleCandidatesKey(id)]);if(!raw)return [];const value=JSON.parse(raw);return Array.isArray(value.items)?value.items:[];}
 async function load(person,report,curation,state){
  const stored=report?.raw?.news?.candidates||[],cached=await read(person.id);
  if(stored.length>10||cached.length)return [...stored,...cached,...(report?.raw?.news?.items||[]),...(report?.news||[])];
  // Old snapshots kept only ten headlines. Populate extra choices on first edit,
  // without changing a ranking snapshot or charging a member refresh.
  let rows;try{rows=await collector(person,{now,inspectOriginalArticles:false,excludeArticle:item=>curation.filter([item],state).length===0});}catch{return [...stored,...(report?.raw?.news?.items||[]),...(report?.news||[])];}
  const items=(rows.candidates||rows.items||[]).slice(0,200);
  await command(['SET',articleCandidatesKey(person.id),JSON.stringify({items,at:now()}),'EX','86400']);
  return [...items,...(report?.raw?.news?.items||[]),...(report?.news||[])];
 }
 return {read,load};
}
