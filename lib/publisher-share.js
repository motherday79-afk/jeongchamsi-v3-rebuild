const clean=value=>String(value??'').trim();
const fraction=(count,total)=>({count,total,share:count/total*100});

function safeUrl(value){
 const text=clean(value);if(!/^https?:\/\//i.test(text))return '';
 try{const url=new URL(text);return /^(https?:)$/.test(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}
}

// Input is the published media index after article deduplication and period filtering.
// A denominator counts articles about the same registered population, never mentions.
export function analyzePublisherShare(rows=[],people=[],{publisher='',targetIds=[],targetName='',targetKind='none'}={}){
 const profiles=new Map(people.filter(person=>person?.id&&person.isVacant!==true).map(person=>[person.id,person]));
 const targets=new Set([...targetIds].filter(id=>profiles.has(id)));
 if(!publisher||!clean(targetName)||!['person','party'].includes(targetKind)||!targets.size)return null;
 const populationRows=rows.filter(row=>row.people?.some(id=>profiles.has(id)));
 const selectedRows=[],otherRows=[],otherSources=new Set(),selectedCounts=new Map(),otherCounts=new Map();
 let unattributedCount=0,selectedTargetCount=0,otherTargetCount=0;
 for(const row of populationRows){
  if(!row.source){unattributedCount++;continue;}
  const selected=row.source===publisher,counts=selected?selectedCounts:otherCounts;
  (selected?selectedRows:otherRows).push(row);
  if(!selected)otherSources.add(row.source);
  for(const id of new Set(row.people))if(profiles.has(id))counts.set(id,(counts.get(id)||0)+1);
  if(row.people.some(id=>targets.has(id))){if(selected)selectedTargetCount++;else otherTargetCount++;}
 }
 if(!selectedRows.length||!otherRows.length)return null;
 const comparison=(subject,selectedCount,otherCount)=>{
  const selected=fraction(selectedCount,selectedRows.length),other=fraction(otherCount,otherRows.length);
  const sampleLimited=selected.total<20||other.total<20||selected.count<5||other.count<5;
  return {...subject,selected,other,differencePp:selected.share-other.share,ratio:sampleLimited||other.share===0?null:selected.share/other.share,sampleLimited};
 };
 const target=comparison({id:targetKind==='person'?[...targets][0]:'',name:clean(targetName),kind:targetKind},selectedTargetCount,otherTargetCount);
 const peers=[...new Set([...selectedCounts.keys(),...otherCounts.keys()])].filter(id=>!targets.has(id)).map(id=>{
  const person=profiles.get(id);
  return comparison({id,name:clean(person.name),party:clean(person.party),kind:'person'},selectedCounts.get(id)||0,otherCounts.get(id)||0);
 });
 const byName=(a,b)=>a.name.localeCompare(b.name,'ko')||a.id.localeCompare(b.id);
 const higher=peers.filter(row=>row.differencePp>0).sort((a,b)=>b.differencePp-a.differencePp||byName(a,b)).slice(0,3);
 const lower=peers.filter(row=>row.differencePp<0).sort((a,b)=>a.differencePp-b.differencePp||byName(a,b)).slice(0,3);
 const evidence=(articles,ids)=>articles.filter(row=>row.people.some(id=>ids.has(id))).sort((a,b)=>b.stamp-a.stamp).slice(0,3).map(row=>({title:clean(row.title),source:row.source,date:new Date(row.stamp).toISOString(),url:safeUrl(row.url)}));
 for(const subject of [target,...higher,...lower]){
  const ids=subject===target?targets:new Set([subject.id]);
  subject.evidence={selected:evidence(selectedRows,ids),other:evidence(otherRows,ids)};
 }
 return {publisher,populationCount:profiles.size,otherPublisherCount:otherSources.size,unattributedCount,target,higher,lower};
}
