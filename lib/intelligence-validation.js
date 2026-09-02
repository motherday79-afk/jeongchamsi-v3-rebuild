const score=value=>Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=100;

export function validateIntelligenceDraft(draft){
  const errors=[];
  if(!draft?.id)errors.push('PERSON_ID_MISSING');
  if(!draft?.snapshot)errors.push('SNAPSHOT_MISSING');
  if(!draft?.algorithmVersion)errors.push('ALGORITHM_VERSION_MISSING');
  const arrays={core:6,activity:3,media:3,transition:4,cohorts:5,issues:4,risks:3,opportunities:3,strategies:8,sources:4};
  for(const [key,min] of Object.entries(arrays))if(!Array.isArray(draft?.[key])||draft[key].length<min)errors.push(`${key.toUpperCase()}_INCOMPLETE`);
  const required=['signal','audience','diagnosis','support','resilience','mediaScores','conclusion'];
  for(const key of required)if(!draft?.[key])errors.push(`${key.toUpperCase()}_MISSING`);
  const cohorts=Array.isArray(draft?.cohorts)?draft.cohorts:[],male=cohorts.map(row=>row.male),female=cohorts.map(row=>row.female),pairs=cohorts.map(row=>`${row.male}:${row.female}`);
  if(cohorts.length&&((new Set(male).size<3&&new Set(female).size<3)||new Set(pairs).size<3))errors.push('COHORT_VECTOR_CLONED');
  for(const value of [...male,...female])if(!score(value))errors.push('COHORT_SCORE_INVALID');
  for(const item of [...(draft?.core||[]),...(draft?.activity||[]),...(draft?.media||[]),...(draft?.transition||[])])if(!score(item?.score))errors.push('METRIC_SCORE_INVALID');
  if((draft?.sources||[]).some(source=>!source?.type||!source?.url))errors.push('SOURCE_PROVENANCE_INCOMPLETE');
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}

export function validateSnapshot(drafts,expectedIds=[]){
  const rows=Array.isArray(drafts)?drafts:[],expected=[...new Set((expectedIds||[]).map(String))],ids=rows.map(row=>String(row?.id||'')),seen=new Set(),duplicateIds=[];
  for(const id of ids){if(seen.has(id))duplicateIds.push(id);seen.add(id);}
  const missingIds=expected.filter(id=>!seen.has(id)),unexpectedIds=ids.filter(id=>!expected.includes(id));
  const invalid=rows.map(draft=>({id:draft?.id||'',validation:validateIntelligenceDraft(draft)})).filter(item=>!item.validation.ok);
  return {ok:missingIds.length===0&&duplicateIds.length===0&&unexpectedIds.length===0&&invalid.length===0,total:rows.length,expected:expected.length,missingIds,duplicateIds:[...new Set(duplicateIds)],unexpectedIds:[...new Set(unexpectedIds)],invalid};
}

