const VERIFIED_AT='2026-09-03';
const ASSEMBLY_SOURCE='대한민국 국회 공개정보';

const CURRENT_ROLE_UPDATES=Object.freeze({
  김민석:{title:'더불어민주당 당대표',jurisdiction:'서울 영등포구 을',effectiveFrom:'2026-08-17',roleStatus:'appointed',sourceId:'democratic-national-convention-2026-08-17',sourceLabel:'더불어민주당 2026년 8월 17일 전국당원대회',history:[{title:'대한민국 국무총리',effectiveFrom:'2025-07-03',effectiveTo:'2026-08-16',roleStatus:'ended',sourceId:'office-of-prime-minister-career'}]},
  최민희:{title:'더불어민주당 최고위원',effectiveFrom:'2026-08-17',roleStatus:'appointed',sourceId:'democratic-national-convention-2026-08-17',sourceLabel:'더불어민주당 2026년 8월 17일 전국당원대회'},
  박선원:{title:'더불어민주당 최고위원',effectiveFrom:'2026-08-17',roleStatus:'appointed',sourceId:'democratic-national-convention-2026-08-17',sourceLabel:'더불어민주당 2026년 8월 17일 전국당원대회'},
  서미화:{title:'더불어민주당 최고위원',effectiveFrom:'2026-08-17',roleStatus:'appointed',sourceId:'democratic-national-convention-2026-08-17',sourceLabel:'더불어민주당 2026년 8월 17일 전국당원대회'},
  이성윤:{title:'더불어민주당 최고위원',effectiveFrom:'2026-08-17',roleStatus:'appointed',sourceId:'democratic-national-convention-2026-08-17',sourceLabel:'더불어민주당 2026년 8월 17일 전국당원대회'},
  한민수:{title:'더불어민주당 최고위원',effectiveFrom:'2026-08-17',roleStatus:'appointed',sourceId:'democratic-national-convention-2026-08-17',sourceLabel:'더불어민주당 2026년 8월 17일 전국당원대회'},
  이소영:{title:'중소벤처기업부 장관 후보자',effectiveFrom:'2026-08-30',roleStatus:'nominated',sourceId:'presidential-office-cabinet-briefing-2026-08-30',sourceLabel:'대통령실 2026년 8월 30일 인선 발표'},
  김승원:{title:'법무부 장관 후보자',effectiveFrom:'2026-08-30',roleStatus:'nominated',sourceId:'presidential-office-cabinet-briefing-2026-08-30',sourceLabel:'대통령실 2026년 8월 30일 인선 발표'},
  용혜인:{title:'성평등가족부 장관 후보자',effectiveFrom:'2026-08-30',roleStatus:'nominated',sourceId:'presidential-office-cabinet-briefing-2026-08-30',sourceLabel:'대통령실 2026년 8월 30일 인선 발표'}
});

const clean=value=>String(value||'').trim();
const role=(title,values={})=>({title:clean(title),effectiveFrom:clean(values.effectiveFrom),effectiveTo:clean(values.effectiveTo),roleStatus:clean(values.roleStatus)||'appointed',sourceId:clean(values.sourceId),sourceUrl:clean(values.sourceUrl),sourceLabel:clean(values.sourceLabel),verifiedAt:clean(values.verifiedAt)||VERIFIED_AT});

function electedRole(person){
  const title=person.type==='assembly'?'제22대 국회의원':clean(person.office||person.roleLabel);
  return role(title,{effectiveFrom:person.termStart, effectiveTo:person.termEnd,roleStatus:person.isVacant?'ended':'appointed',sourceId:`profile-${person.id}`,sourceLabel:clean(person.source)||ASSEMBLY_SOURCE});
}

export function applyPoliticianRoleUpdates(person){
  if(!person||typeof person!=='object')return person;
  const elected=electedRole(person),update=CURRENT_ROLE_UPDATES[clean(person.name)]||null;
  const primary=update?role(update.title,update):elected;
  const currentRoles=update?[primary,elected]:[primary];
  const jurisdiction=clean(update?.jurisdiction)||person.jurisdiction;
  const secondaryRole=update&&person.type==='assembly'?[elected.title,jurisdiction].filter(Boolean).join(' · '):'';
  const roleHistory=[...(Array.isArray(person.roleHistory)?person.roleHistory:[]),...(update?.history||[])].map(item=>role(item.title,item));
  return {
    ...person,
    jurisdiction,
    office:primary.title,
    primaryRole:primary,
    secondaryRole,
    currentRoles,
    roleHistory,
    effectiveFrom:primary.effectiveFrom,
    effectiveTo:primary.effectiveTo,
    roleStatus:primary.roleStatus,
    sourceId:primary.sourceId,
    sourceUrl:primary.sourceUrl,
    verifiedAt:primary.verifiedAt
  };
}

export function applyPoliticianRoleUpdatesToGroups(groups={}){
  return Object.fromEntries(Object.entries(groups).map(([type,items])=>[type,Array.isArray(items)?items.map(applyPoliticianRoleUpdates):[]]));
}
