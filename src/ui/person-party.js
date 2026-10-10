const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const partyOf=person=>String(person?.party??person?.partyLabel??'').trim();
export function usesJcsFlag(person={}){if(person.isVacant)return false;const party=partyOf(person),id=String(person.personId||person.id||'');return !party||(party==='무소속'&&(person.type==='government'||person.type==='nonincumbent'||/^(government|nonincumbent)-/.test(id)));}
export function personPartyMarkup(person={}){return usesJcsFlag(person)?'<img class="jcs-person-party-flag" src="/assets/brand/jcs-flag-494.svg" width="32" height="24" alt="정참시 J 깃발" title="정참시 인물 표시">':esc(partyOf(person));}
export function personMetaMarkup(person={},region=person.district||person.jurisdiction||person.region){return [personPartyMarkup(person),esc(region)].filter(Boolean).join(' · ');}
