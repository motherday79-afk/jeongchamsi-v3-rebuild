let current={count:null,date:''};
const day=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
export const dailyVisitCount=()=>current.date===day()?current.count:null;
export function paintVisitCount(){for(const el of document.querySelectorAll('[data-daily-visits]'))el.textContent=dailyVisitCount()===null?'—':current.count.toLocaleString('ko-KR');}
export async function refreshVisitCount(record=false){
 try{const response=await fetch('/api/v3/site/visits',{method:record?'POST':'GET',cache:'no-store',credentials:'same-origin'});const data=await response.json();if(response.ok&&data.ok&&data.date===day()){current={count:current.date===data.date?Math.max(Number(current.count||0),data.count):data.count,date:data.date};paintVisitCount();}}catch{}
}
export function startVisitCount(){
 window.addEventListener('jcs:visit-refresh',()=>void refreshVisitCount(true));
 void refreshVisitCount(true);
 window.addEventListener('pageshow',e=>{if(e.persisted)void refreshVisitCount(true);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshVisitCount();});
 const midnight=()=>{const ms=86400000-((Date.now()+9*3600000)%86400000);setTimeout(()=>{current={count:null,date:''};paintVisitCount();void refreshVisitCount();midnight();},ms+50);};midnight();
}
