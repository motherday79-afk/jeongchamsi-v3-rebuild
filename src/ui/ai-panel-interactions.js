const maxBytes=4*1024*1024;
const parse=(raw,array)=>{const value=JSON.parse(raw|| (array?'[]':'{}'));if(array?!Array.isArray(value):!value||typeof value!=='object'||Array.isArray(value))throw Error('JSON 형식을 확인해 주세요.');return value;};
const number=v=>v==null||String(v).trim()===''?null:Number(v);
const isoWeek=value=>{const d=new Date(`${value}T12:00:00Z`);if(!Number.isFinite(d.getTime()))return '';const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);const year=d.getUTCFullYear(),first=new Date(Date.UTC(year,0,1)),week=Math.ceil((((d-first)/86400000)+1)/7);return `${year}-W${String(week).padStart(2,'0')}`;};
const latestHumanItems=items=>{const seen=new Set();return [...(Array.isArray(items)?items:[])].sort((a,b)=>String(b.publishedDate||'').localeCompare(String(a.publishedDate||''))).filter(p=>{if(!p?.institution||seen.has(p.institution))return false;seen.add(p.institution);return true;});};
const usablePoll=p=>p&&p.results?.overall&&typeof p.results.overall.positive==='number'&&typeof p.results.overall.negative==='number';
const choiceAliases={
 'very-positive':'very-positive',very_positive:'very-positive','매우 잘하고 있다':'very-positive','매우잘함':'very-positive',
 positive:'positive','잘하는 편이다':'positive','잘함':'positive',
 negative:'negative','잘못하는 편이다':'negative','잘못함':'negative',
 'very-negative':'very-negative',very_negative:'very-negative','매우 잘못하고 있다':'very-negative','매우잘못함':'very-negative',
 undecided:'undecided','판단 유보 / 모르겠다':'undecided','판단유보':'undecided','모르겠다':'undecided'
};
function normalizeOperatorResponses(rows){
 if(!Array.isArray(rows))throw Error('RESP_FORMAT');
 if(rows.length!==1000)throw Error(`RESP_COUNT:${rows.length}`);
 const seen=new Set(),duplicates=[],badIds=[],badChoices=[];
 const normalized=rows.map((row,index)=>{
  if(!row||typeof row!=='object'||Array.isArray(row)){badIds.push(`#${index+1}`);return row;}
  const id=String(row.id||'').trim(),expected=`JCS-AI-${String(index+1).padStart(4,'0')}`;
  if(!/^JCS-AI-\d{4}$/.test(id)||id!==expected)badIds.push(id||`#${index+1}`);
  if(seen.has(id))duplicates.push(id);seen.add(id);
  const raw=String(row.choice??'').trim(),choice=choiceAliases[raw];if(!choice)badChoices.push(`${id||`#${index+1}`}:${raw||'비어있음'}`);
  return {...row,id,choice:choice||raw};
 });
 if(duplicates.length)throw Error(`RESP_DUP:${[...new Set(duplicates)].slice(0,5).join(',')}:${duplicates.length}`);
 if(badIds.length)throw Error(`RESP_ID:${badIds.slice(0,5).join(',')}:${badIds.length}`);
 if(badChoices.length)throw Error(`RESP_CHOICE:${badChoices.slice(0,5).join(',')}:${badChoices.length}`);
 return normalized;
}
export function aiPanelPayload(operation,data){
 const input=Object.fromEntries(data);delete input.profilesJson;delete input.responsesJson;delete input.sourcesJson;delete input.subgroupsJson;delete input.provenanceJson;
 if(operation==='panel-create')return {name:input.name,isSample:data.has('isSample'),population:{sourceUrl:input.sourceUrl,referenceDate:input.referenceDate,notes:input.notes},profiles:parse(data.get('profilesJson'),true)};
 if(operation==='create'){if(!String(input.week||'').trim()&&input.basisDate)input.week=isoWeek(input.basisDate);return {...input,modes:data.getAll('modes')};}
 if(operation==='environment'){
  const raw=String(data.get('sourcesJson')||'').trim();let sources=raw?parse(raw,true):[];
  if(!sources.length)for(let i=1;i<=4;i++){const title=String(data.get(`source${i}Title`)||'').trim(),url=String(data.get(`source${i}Url`)||'').trim();if(!title&&!url)continue;if(!title||!url)throw Error('출처 제목과 URL을 함께 입력해 주세요.');sources.push({title,url,publishedAt:null,containsPollNumbers:data.has(`source${i}Poll`)});}
  for(let i=1;i<=4;i++){delete input[`source${i}Title`];delete input[`source${i}Url`];delete input[`source${i}Poll`];}
  return {...input,sources};
 }
 if(operation==='responses')return {...input,executedAt:input.executedAt?new Date(input.executedAt).toISOString():new Date().toISOString(),responses:parse(data.get('responsesJson'),true)};
 if(operation==='human'){
  const groups=parse(data.get('subgroupsJson'),false),overall={};for(const key of ['positive','negative','undecided','n']){overall[key]=number(input[key]);delete input[key];}
  for(const key of ['sampleSize','responseRate','marginOfError'])input[key]=number(input[key]);if(!String(input.id||'').trim())input.id=`manual-${Date.now()}`;
  return {poll:{...input,...(data.get('provenanceJson')?{provenance:parse(data.get('provenanceJson'),false)}:{}),comparable:data.has('comparable'),results:{gender:groups.gender||{},age:groups.age||{},region:groups.region||{},overall}}};
 }
 return input;
}
const messages={HUMAN_POLL_BUSY:'다른 수집이 진행 중입니다. 잠시 후 다시 확인해 주세요.',HUMAN_POLL_FORBIDDEN:'관리자 로그인을 확인해 주세요.',HUMAN_POLL_ORIGIN_INVALID:'페이지를 새로고침한 뒤 다시 시도해 주세요.',HUMAN_POLL_UNAVAILABLE:'수집 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',AI_PANEL_CONFLICT:'다른 관리자가 자료를 변경했습니다. 새로고침 후 다시 시도해 주세요.',AI_PANEL_FORBIDDEN:'관리자 로그인을 확인해 주세요.',AI_PANEL_LOCKED:'이미 확정된 AI 자료입니다. 새 회차를 만들어 주세요.',AI_PANEL_NETWORK_FAILED:'연결하지 못했습니다. 입력 내용은 유지됩니다.',AI_PANEL_INPUT_INVALID:'필수 입력값 또는 파일 형식을 확인해 주세요.',AI_PANEL_RERUN_REQUIRED:'같은 주차의 재실행은 재실행 사유가 필요합니다.',AI_PANEL_ENVIRONMENT_REQUIRED:'먼저 AI 참고자료를 저장해 주세요.',AI_PANEL_RESPONSES_REQUIRED:'먼저 AI 응답파일을 등록해 주세요.',AI_PANEL_RESPONSES_INVALID:'AI 응답파일의 ID 수·중복·응답값을 확인해 주세요.',AI_PANEL_HUMAN_REQUIRED:'게시하려면 긍정·부정·유보가 모두 있는 HUMAN 자료를 비교 가능으로 저장해 주세요.',AI_PANEL_HUMAN_INVALID:'HUMAN 조사 숫자와 원문 URL을 확인해 주세요.',AI_PANEL_HUMAN_DUPLICATE:'이미 등록된 HUMAN 조사입니다.',AI_PANEL_REVIEW_REQUIRED:'먼저 결과 검수를 완료해 주세요.',AI_PANEL_PUBLISH_INVALID:'정식 1,000명 패널만 게시할 수 있습니다.',AI_PANEL_BLIND_POLL_LEAKAGE:'BLIND 모드에는 여론조사 수치가 포함된 자료를 넣을 수 없습니다.'};
export async function simpleOperatorUpload({client,panelId,responses}={}){
 if(!client)throw Error('AI_PANEL_NETWORK_FAILED');responses=normalizeOperatorResponses(responses);
 const [manage,human]=await Promise.all([client.list({manage:true}),client.humanPolls()]);
 if(!manage?.ok)throw Error(manage?.error||'AI_PANEL_NETWORK_FAILED');if(!human?.ok)throw Error(human?.error||'HUMAN_POLL_UNAVAILABLE');
 const polls=latestHumanItems(human.items).filter(usablePoll);if(!polls.length)throw Error('AI_PANEL_HUMAN_REQUIRED');
 panelId=panelId||manage.panels?.find(p=>!p.isSample&&(p.profileCount===1000||p.count===1000))?.id;const selectedPanel=manage.panels?.find(p=>p.id===panelId);if(!selectedPanel||selectedPanel.isSample||(selectedPanel.profileCount??selectedPanel.count)!==1000)throw Error('AI_PANEL_INPUT_INVALID');
 const basisDate=polls.map(p=>p.publishedDate).filter(Boolean).sort().at(-1)||new Date().toISOString().slice(0,10),week=isoWeek(basisDate);
 const sameWeek=(manage.runs||[]).filter(r=>r.week===week).sort((a,b)=>(b.runNumber||0)-(a.runNumber||0));let result,run;
 const draft=sameWeek.find(r=>r.status==='draft');
 if(draft){result=await client.get(draft.id,{edit:true});if(!result?.ok)throw Error(result?.error||'AI_PANEL_NETWORK_FAILED');run=result.item;}
 else{const latest=sameWeek[0],input={week,basisDate,question:'대통령이 대통령으로서의 직무를 잘 수행하고 있다고 보십니까, 잘못 수행하고 있다고 보십니까?',questionVersion:'v1',panelId,modes:['EXPOSED'],...(latest?{sourceRunId:latest.id,rerunReason:'관리자 동일 주차 AI 응답 재등록'}:{})};result=await client.save({operation:'create',id:'',version:0,input});if(!result?.ok)throw Error(result?.error||'AI_PANEL_NETWORK_FAILED');run=result.item;}
 let version=Number(run.version)||1;
 for(const poll of polls){if((run.humanPolls||[]).some(p=>p.id===poll.id))continue;const normalized={...poll,comparable:true,comparisonNote:poll.comparisonNote||'JCS AI 대통령 직무평가와 동일 주제의 최신 HUMAN 조사로 자동 연결'};result=await client.save({operation:'human',id:run.id,version,input:{poll:normalized}});if(!result?.ok&&result?.error!=='AI_PANEL_HUMAN_DUPLICATE')throw Error(result?.error||'AI_PANEL_NETWORK_FAILED');if(result?.ok){run=result.item;version=Number(run.version)||version+1;}}
 if(!run.environments?.EXPOSED){const sources=polls.map(p=>({title:`${p.institution} 최신 대통령 직무평가`,url:p.sourceUrl,containsPollNumbers:true,publishedAt:null}));result=await client.save({operation:'environment',id:run.id,version,input:{mode:'EXPOSED',notes:'관리자 간편 업로드 · 최신 HUMAN 조사 확인 후 ChatGPT에서 생성한 AI 응답파일',sources}});if(!result?.ok)throw Error(result?.error||'AI_PANEL_NETWORK_FAILED');run=result.item;version=Number(run.version)||version+1;}
 result=await client.save({operation:'responses',id:run.id,version,input:{mode:'EXPOSED',model:'ChatGPT · 관리자 업로드',executedAt:new Date().toISOString(),responses}});if(!result?.ok)throw Error(result?.error||'AI_PANEL_NETWORK_FAILED');return result;
}
export function bindAiPanelInteractions(root,{client,onSaved=()=>{},navigate=()=>{}}={}){
 const states=new WeakMap();const state=form=>{if(!states.has(form))states.set(form,{busy:false,files:new Map()});return states.get(form);};
 const notice=(form,text)=>{const el=form.querySelector('[data-ai-form-state]');if(el)el.textContent=text;};
 root.addEventListener('submit',async event=>{
  const finalize=event.target.closest('[data-ai-finalize]');if(finalize){event.preventDefault();const s=state(finalize);if(s.busy)return;const id=finalize.dataset.id;let version=Number(finalize.dataset.version)||0,status=finalize.dataset.status||'draft',result=null;const sample=finalize.dataset.sample==='1',button=finalize.querySelector('button');s.busy=true;if(button)button.disabled=true;notice(finalize,'결과를 확인하고 확정하고 있습니다…');try{const steps=[];if(status==='draft')steps.push(['review',{note:'관리자 간편 확정'}]);if(['draft','reviewed'].includes(status))steps.push(['lock',{}]);if(!sample&&['draft','reviewed','locked'].includes(status))steps.push(['publish',{}]);for(const [operation,input] of steps){result=await client.save({operation,id,version,input});if(!result?.ok){notice(finalize,messages[result?.error]||`처리하지 못했습니다. (${result?.error||'연결 오류'})`);return;}version=Number(result.item?.version)||version+1;status=result.item?.status||status;}notice(finalize,sample?'검수와 LOCK을 완료했습니다.':'결과를 확정하고 게시했습니다.');if(result)await onSaved(result,'finalize');}catch{notice(finalize,'확정 결과를 확인하지 못했습니다. 새로고침해 상태를 확인해 주세요.');}finally{s.busy=false;if(button)button.disabled=false;}return;}
  const search=event.target.closest('[data-ai-search]');if(search){event.preventDefault();navigate('/ai-panel?'+new URLSearchParams(new FormData(search)));return;}
  const form=event.target.closest('[data-ai-form]');if(!form)return;event.preventDefault();const s=state(form);if(s.busy)return;
  if([...s.files.values()].some(x=>x!=='ready')){notice(form,'파일 읽기가 끝났는지 확인하고, 실패한 파일은 다시 선택해 주세요.');return;}
  let input;try{input=aiPanelPayload(form.dataset.aiForm,new FormData(form));}catch{notice(form,'JSON 형식 또는 날짜를 확인해 주세요. 입력 내용은 유지됩니다.');return;}
  s.busy=true;const buttons=[...form.querySelectorAll('button')],disabled=buttons.map(x=>x.disabled);buttons.forEach(x=>x.disabled=true);notice(form,form.dataset.aiForm==='collect'?'최신 조사를 확인하고 있습니다…':'저장하고 있습니다…');
  try{const result=form.dataset.aiForm==='collect'?await client.collectHumanPolls():await client.save({operation:form.dataset.aiForm,id:form.dataset.id||'',version:Number(form.dataset.version)||0,input});if(!result?.ok){notice(form,messages[result?.error]||`저장하지 못했습니다. 입력값을 확인해 주세요. (${result?.error||'연결 오류'})`);return;}notice(form,'저장했습니다.');await onSaved(result,form.dataset.aiForm);}catch{notice(form,'저장 결과를 확인하지 못했습니다. 새로고침하여 확인해 주세요.');}finally{s.busy=false;buttons.forEach((x,i)=>x.disabled=disabled[i]);}
 });
 root.addEventListener('change',async event=>{
  const simple=event.target.closest('[data-ai-simple-response]');
  if(simple){
   const form=simple.closest('[data-ai-simple-upload]'),file=simple.files?.[0],s=state(form);if(!file)return;if(s.busy)return;
   s.busy=true;simple.disabled=true;notice(form,'AI 응답파일을 확인하고 있습니다…');
   try{
    if(file.size>maxBytes)throw Error('FILE');const text=await file.text();const responses=parse(text,true);
    const result=await simpleOperatorUpload({client,panelId:form.dataset.panelId,responses});
    notice(form,result?.item?.sourceRunId?'AI 응답 1,000개 확인 완료 · 새 RUN을 만들었습니다. 이제 ③ 메인에 재게시를 누르면 됩니다.':'AI 응답 1,000개 확인 완료 · ID 정상 · 중복 없음 · 응답값 정상. 이제 ③ 메인에 게시만 누르면 됩니다.');await onSaved(result,'simple-upload');
   }catch(error){const code=String(error?.message||'');let friendly=messages[code]||messages[`AI_PANEL_${code}`];
    if(code.startsWith('RESP_COUNT:'))friendly=`AI 응답은 정확히 1,000개여야 합니다. 현재 ${code.split(':')[1]}개입니다.`;
    else if(code.startsWith('RESP_DUP:'))friendly=`중복 ID가 있습니다: ${code.split(':')[1]} (중복 ${code.split(':')[2]}건).`;
    else if(code.startsWith('RESP_ID:'))friendly=`ID 형식 또는 순서가 맞지 않습니다: ${code.split(':')[1]} (오류 ${code.split(':')[2]}건).`;
    else if(code.startsWith('RESP_CHOICE:'))friendly=`응답값을 읽지 못한 항목이 있습니다: ${code.split(':')[1]} (오류 ${code.split(':')[2]}건).`;
    else if(code==='FILE')friendly='응답파일이 너무 큽니다. 4MB 이하 JSON 파일을 선택해 주세요.';
    notice(form,friendly||'응답파일을 처리하지 못했습니다. 파일 형식을 확인해 주세요.');}
   finally{s.busy=false;simple.disabled=false;}
   return;
  }
  const fileInput=event.target.closest('[data-ai-json-target]');if(!fileInput)return;const form=fileInput.closest('form'),s=state(form),key=fileInput.dataset.aiJsonTarget,file=fileInput.files?.[0],token={};s.files.set(key,token);if(!file){s.files.delete(key);return;}try{if(file.size>maxBytes)throw Error();const text=await file.text();JSON.parse(text);if(s.files.get(key)!==token)return;form.elements.namedItem(key).value=text;s.files.set(key,'ready');notice(form,'파일을 읽었습니다. 내용을 확인한 뒤 저장해 주세요.');}catch{if(s.files.get(key)===token){s.files.set(key,'failed');notice(form,'JSON 파일을 읽지 못했습니다. 4MB 이하의 올바른 파일을 다시 선택해 주세요.');}}
 });
 root.addEventListener('click',event=>{
  const imported=event.target.closest('[data-ai-import]');if(imported){const form=imported.closest('form');try{const poll=JSON.parse(form.querySelector('[data-ai-import-source]').value);for(const key of ['id','institution','commissioner','title','startDate','endDate','publishedDate','sampleSize','method','responseRate','marginOfError','sourceUrl','question','comparisonNote','topic','fetchedAt']){const field=form.elements.namedItem(key);if(field)field.value=poll[key]??'';}for(const key of ['positive','negative','undecided','n'])form.elements.namedItem(key).value=poll.results?.overall?.[key]??'';form.elements.namedItem('subgroupsJson').value=JSON.stringify({gender:poll.results?.gender||{},age:poll.results?.age||{},region:poll.results?.region||{}});form.elements.namedItem('provenanceJson').value=JSON.stringify(poll.provenance||{});form.elements.namedItem('comparable').checked=false;state(form).files.delete('subgroupsJson');notice(form,poll.provenance?.questionKind==='source-summary'?'수치를 불러왔습니다. 조사 주제 요약이므로 질문지 원문·척도·기간을 확인해 주세요.':'수치를 불러왔습니다. 질문과 조사 기간을 확인한 뒤 비교 적합성을 체크해 주세요.');}catch{notice(form,'불러올 조사를 선택해 주세요.');}return;}
  const sample=event.target.closest('[data-ai-sample]');if(sample){const form=sample.closest('form');form.elements.namedItem('isSample').checked=true;form.elements.namedItem('profilesJson').value=JSON.stringify(Array.from({length:Number(sample.dataset.aiSample)},(_,i)=>({id:`JCS-AI-${String(i+1).padStart(4,'0')}`,gender:'DEV 미설정',age:'DEV 미설정',region:'DEV 미설정',politicalInterest:'DEV 미설정',pollExposure:false})),null,2);state(form).files.delete('profilesJson');notice(form,'공개할 수 없는 개발 샘플입니다.');return;}
  const button=event.target.closest('[data-ai-template]');if(!button)return;const templates={profiles:[{id:'JCS-AI-0001',gender:'입력',age:'입력',region:'입력',politicalInterest:'입력',pollExposure:false}],responses:[{id:'JCS-AI-0001',choice:'undecided',reason:'실제 응답 사유',explanation:'실제 응답 설명',factors:[]}],human:{gender:{},age:{},region:{}}};const url=URL.createObjectURL(new Blob([JSON.stringify(templates[button.dataset.aiTemplate],null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`jcs-ai-${button.dataset.aiTemplate}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
}
