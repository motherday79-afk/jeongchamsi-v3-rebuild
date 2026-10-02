// Read edit state fresh for every request, but do no editorial work for untouched profiles.
export async function readArticleCurations(command,personIds){
 const ids=[...new Set(personIds)],result=new Map();if(!ids.length)return result;
 const values=await command(['MGET',...ids.map(id=>'jcs:v3:article-curation:'+encodeURIComponent(id))]);
 for(let i=0;i<ids.length;i++){const state=values[i]?JSON.parse(values[i]):null;if(state&&(state.excluded?.length||Object.keys(state.placements||{}).length||Object.values(state.snapshots||{}).some(row=>row.restoredAt)))result.set(ids[i],{state,candidates:[]});}
 const edited=[...result.keys()];if(edited.length){const cached=await command(['MGET',...edited.map(id=>'jcs:v3:article-candidates:'+encodeURIComponent(id))]);edited.forEach((id,i)=>{result.get(id).candidates=cached[i]?JSON.parse(cached[i]).items||[]:[]});}
 return result;
}
export function applyArticleCuration(report,states,service){
 const entry=states.get(report?.id);if(!entry)return report;
 const merged=entry.candidates.length?{...report,raw:{...report.raw,news:{...report.raw?.news,candidates:[...(report.raw?.news?.candidates||[]),...entry.candidates]}}}:report;
 return service.apply(merged,entry.state);
}
