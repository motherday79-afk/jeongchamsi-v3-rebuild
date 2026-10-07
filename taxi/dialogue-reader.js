export function splitDialogue(text){let cursor=0;return String(text||'').split(/(?<=[.!?])\s+/u).filter(Boolean).map(text=>{const start=cursor;cursor+=text.length+1;return {text,start,end:start+text.length};});}
const normalize=text=>String(text||'').replace(/\s+/g,'');
export function sentenceAt(cues,seconds,sentences){
 let cue=null;for(const item of cues){if(item.start>seconds+.04)break;cue=item;}if(!cue)return 0;
 const text=normalize(cue.text);let index=sentences.findIndex(s=>normalize(s.text)===text);
 if(index<0)index=sentences.findIndex(s=>normalize(s.text).includes(text)||text.includes(normalize(s.text)));
 return Math.max(0,index);
}
export class DialogueReader{
 constructor(){this.key='';this.cues=[];this.sentences=[];this.box=null;this.lastIndex=-1;}
 setBeat(beat){
  const key=beat?.audioUrl||'';if(key===this.key)return;this.key=key;this.cues=[];this.sentences=splitDialogue(beat?.text);this.lastIndex=-1;this.box=null;
  if(beat?.timingsUrl)fetch(beat.timingsUrl,{cache:'force-cache'}).then(r=>r.ok?r.json():[]).then(cues=>{if(this.key===key&&Array.isArray(cues))this.cues=cues.filter(c=>Number.isFinite(c.start)&&typeof c.text==='string').sort((a,b)=>a.start-b.start);}).catch(()=>{});
 }
 update({seconds,following,comfort=false}){
  const box=document.querySelector('#dialogue-scroll');if(!box?.querySelectorAll)return;
  const fresh=this.box!==box;if(fresh){this.box=box;this.lastIndex=-1;}
  const auto=following&&(comfort||this.cues.length>0);
  box.classList.toggle('auto-follow',auto);box.setAttribute('aria-label',auto?'승객 대사 · 음성에 맞춰 자동 스크롤':'승객 대사 · 위아래로 자유롭게 읽기');
  const hint=document.querySelector('#dialogue-scroll-hint');if(hint)hint.textContent=auto?'음성에 맞춰 자동 스크롤 중':'위아래로 스크롤하며 다시 읽을 수 있어요';
  if(!auto){this.lastIndex=-1;return;}
  const index=comfort?this.sentences.length:sentenceAt(this.cues,seconds,this.sentences);
  if(index===this.lastIndex&&!fresh)return;this.lastIndex=index;
  const spans=[...box.querySelectorAll('[data-sentence]')];spans.forEach((el,i)=>el.classList.toggle('is-speaking',i===index));
  const target=comfort?box.querySelector('#gentle-line'):spans[index];if(!target)return;
  const top=target.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop-12;
  box.scrollTo({top:Math.max(0,top),behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
}
