export const FORTUNE_CATEGORIES=['money','business','relationship'];
const memory=new Map();
export function fortuneStateKey(userId){return 'jcs:fortune-cards:v1:'+encodeURIComponent(String(userId||''));}
export function readFortuneState(key,date,storage){
 let saved=memory.get(key);
 try{const raw=(storage??globalThis.localStorage)?.getItem(key);if(raw)saved=JSON.parse(raw);}catch{}
 const opened=saved?.date===date&&Array.isArray(saved.opened)?FORTUNE_CATEGORIES.filter(v=>saved.opened.includes(v)):[];
 return {date,opened,selected:opened.includes(saved?.selected)?saved.selected:null};
}
export function revealFortune(state,category){
 if(!FORTUNE_CATEGORIES.includes(category))return state;
 return {...state,opened:[...new Set([...state.opened,category])],selected:category};
}
export function saveFortuneState(key,state,storage){
 memory.set(key,state);
 try{(storage??globalThis.localStorage)?.setItem(key,JSON.stringify(state));}catch{}
}
