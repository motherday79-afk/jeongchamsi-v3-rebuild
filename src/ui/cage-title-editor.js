import { normalizeCageTitle,cageBreakOptions,validateCageTitleLayout } from '../core/cage-title-layout.js?v=0.0.31.166';
import { renderCageBanner } from './home-cage-banner.js?v=0.0.31.166';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const errorText={CAGE_TITLE_TOO_LONG:'이 줄은 제목 영역에 크게 담기 어렵습니다. 다른 줄바꿈 위치를 선택해 주세요.',CAGE_TITLE_BREAK_INVALID:'줄을 나눌 위치를 선택해 주세요.',CAGE_TITLE_CHANGED:'원문 제목이 변경되었습니다. 최신 제목으로 다시 설정해 주세요.'};
function fields(record){
 if(!record)return '<p>설정할 케이지가 없습니다.</p>';
 const title=normalizeCageTitle(record.title),saved=record.layout?.title===title?record.layout:null,options=cageBreakOptions(title),defaultBreak=options.reduce((best,row)=>Math.abs(row.first.length-row.second.length)<Math.abs(best.first.length-best.second.length)?row:best,options[0]||{index:0,first:'',second:''}).index;
 const split=saved?.breakAt??defaultBreak;
 return `<input type="hidden" name="cageTitleId" value="${esc(record.id)}"><input type="hidden" name="cageTitleSource" value="${esc(title)}"><label class="cage-title-check"><input type="checkbox" name="cageTitleEnabled" ${saved?'checked':''}> 제목 줄바꿈과 강조 직접 지정</label><div class="cage-title-options"><label>줄바꿈 위치<select name="cageTitleBreak"><option value="0" ${split===0?'selected':''}>한 줄로 표시</option>${options.map(row=>`<option value="${row.index}" ${row.index===split?'selected':''}>${esc(row.first)} ／ ${esc(row.second)}</option>`).join('')}</select></label><label>강조할 행<select name="cageTitleEmphasis">${[['first','첫째 줄 강조'],['second','둘째 줄 강조'],['equal','동일 크기']].map(([key,label])=>`<option value="${key}" ${(saved?.emphasis||'equal')===key?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="cage-title-help">원문은 그대로 유지합니다. 직접 지정한 줄바꿈은 화면 크기가 바뀌어도 유지됩니다.</p><p data-cage-title-error role="status"></p><div data-cage-title-preview aria-label="케이지 제목 미리보기">${renderCageBanner({title,titleLayout:saved,blue:record.blue,red:record.red})}</div>`;
}
export function renderCageTitleEditor(cages,featuredId,layouts={},stats={}){
 const records=cages.map(item=>({id:String(item.id),title:item.title,layout:layouts?.[item.id]||null,blue:stats[item.id]?.posts?.progressive||0,red:stats[item.id]?.posts?.conservative||0})),record=records.find(x=>x.id===String(featuredId))||records[0];
 return `<div class="cage-title-editor" data-cage-title-editor data-cage-title-records="${esc(JSON.stringify(records))}">${fields(record)}</div>`;
}
const bound=new WeakSet();
export function bindCageTitleEditors(root=document){
 if(bound.has(root))return;bound.add(root);
 root.addEventListener('change',event=>{
  const form=event.target.closest?.('[data-home-cage-form]');if(!form)return;const box=form.querySelector('[data-cage-title-editor]');if(!box)return;
  let records=[];try{records=JSON.parse(box.dataset.cageTitleRecords||'[]');}catch{return;}
  const selected=form.querySelector('[name="id"]')?.value||'',record=records.find(x=>x.id===selected)||records[0];if(!record)return;
  if(event.target.name==='id')box.innerHTML=fields(record);
  if(['cageTitleBreak','cageTitleEmphasis'].includes(event.target.name)){const manual=box.querySelector('[name="cageTitleEnabled"]');if(manual)manual.checked=true;}
  const data=new FormData(form),enabled=data.get('cageTitleEnabled')==='on',layout={title:data.get('cageTitleSource'),breakAt:Number(data.get('cageTitleBreak')),emphasis:data.get('cageTitleEmphasis')};
  let error='';if(enabled){try{validateCageTitleLayout(record.title,layout);}catch(e){error=errorText[e.message]||'제목 설정을 확인해 주세요.';}}
  const message=box.querySelector('[data-cage-title-error]');if(message)message.textContent=error;
  const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=!!error;
  const preview=box.querySelector('[data-cage-title-preview]');if(preview&&!error)preview.innerHTML=renderCageBanner({title:record.title,titleLayout:enabled?layout:null,blue:record.blue,red:record.red});
 });
}
