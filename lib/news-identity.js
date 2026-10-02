// High-recall disambiguation: missing context is uncertainty, not evidence of another person.
export const NEWS_IDENTITY_VERSION='identity-v1';
const escape=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const clean=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const politicalRoles='국회의원|의원|국무총리|총리|대통령|장관|도지사|광역시장|시장|군수|구청장|당대표|대변인|원내대표|최고위원|국회의장|정치인|대선후보';
const professions=[
 {key:'entertainment',role:'배우|탤런트|가수|개그맨|코미디언',topic:/드라마|영화|캐스팅|앨범|콘서트|신곡|뮤직비디오|연기상/},
 {key:'sport',role:'선수|쇼트트랙|스피드스케이팅|축구선수|야구선수|프로골퍼',topic:/금메달|은메달|동메달|우승|결승|준결승|득점|홈런|타율|골 기록|월드컵|올림픽|세계선수권/},
];

export function classifyNewsIdentity(person={},article={}){
 const name=clean(person.name),text=clean(`${article.title||''} ${article.description||''}`);
 if(!name)return {status:'uncertain',exclude:false,reason:'PROFILE_NAME_MISSING'};
 const escaped=escape(name),end='(?=$|[^가-힣a-zA-Z]|[은는이가을를의와과](?=$|[^가-힣a-zA-Z]))';
 if(!text.replace(/\s/g,'').includes(name.replace(/\s/g,'')))return {status:'unrelated',exclude:true,reason:'NAME_ABSENT'};
 // Korean particles and missing headline spaces are not sufficient reasons to drop a candidate.
 // Require the role to qualify this name; a role elsewhere in the article is insufficient.
 const attached=roles=>new RegExp(`(?:${roles})\\s+${escaped}${end}|(?:^|[^가-힣a-zA-Z])${escaped}\\s+(?:(?:전|현)\\s*)?(?:${roles})(?=$|[^가-힣a-zA-Z]|[은는이가을를의와과](?=$|[^가-힣a-zA-Z]))`);
 const qualifiedPolitical=new RegExp(`${escaped}\\s+(?:[가-힣a-zA-Z·]+\\s+){0,3}(?:${politicalRoles})${end}`);
 if(attached(politicalRoles).test(text)||qualifiedPolitical.test(text))return {status:'matched',exclude:false,reason:'NAMED_POLITICAL_ROLE'};
 const biography=clean([person.roleLabel,person.roleHistory,person.primaryRole,person.career,person.careers].map(value=>typeof value==='object'?JSON.stringify(value):value).join(' '));
 for(const group of professions){
  // A following '배우와/배우의' may describe a companion, not the named person's job.
  const occupation=new RegExp(`(?:^|[^가-힣a-zA-Z])(?:${group.role})\\s+${escaped}${end}|(?:^|[^가-힣a-zA-Z])${escaped}\\s+(?:${group.role})(?=$|[,，:：·]|[은는이가을를](?=$|\\s))`);
  if(occupation.test(text)&&group.topic.test(text)){
   if(new RegExp(group.role).test(biography))return {status:'uncertain',exclude:false,reason:'KNOWN_PREVIOUS_OCCUPATION'};
   return {status:'homonym',exclude:true,reason:`NAMED_${group.key.toUpperCase()}_AND_TOPIC`};
  }
 }
 return {status:'uncertain',exclude:false,reason:'INSUFFICIENT_IDENTITY_CONTEXT'};
}
