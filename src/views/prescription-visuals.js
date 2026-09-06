const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):null;
const compact=value=>number(value)===null?'':Number(value).toLocaleString('ko-KR');
const diagnosis=(report,id)=>list(report?.diagnoses).find(row=>row?.id===id)||{};
const display=(report,id)=>diagnosis(report,id)?.display||{};
const linked=item=>list(item?.linkedDiagnosisIds).filter(Boolean).map(id=>`<b>진단 ${esc(id)}</b>`).join('');
const actionRows=(item,limit=3)=>list(item?.actions).filter(text).slice(0,limit);

function actionMarkup(item,limit=3,offset=0){
  const rows=list(item?.actions).filter(text).slice(offset,offset+limit);
  return rows.length?`<div class="jcs-rx-actions">${rows.map((label,index)=>`<div><span>${index+1}</span><p>${esc(label)}</p></div>`).join('')}</div>`:'';
}

function footer(item,extra=''){
  const links=linked(item),tracking=list(item?.monitoringIndicators).filter(text);
  if(!links&&!tracking.length&&!text(extra))return '';
  return `<footer class="jcs-rx-foot">${links?`<div class="jcs-rx-links">${links}</div>`:''}${text(extra)?`<span>${esc(extra)}</span>`:tracking.length?`<span>추적 · ${tracking.map(esc).join(' / ')}</span>`:''}</footer>`;
}

function messagePyramid(item,report){
  const steps=actionRows(item),layers=[item.messageDirection,item.target,steps[0]].filter(text).slice(0,3);
  if(!layers.length)return '';
  const risk=text(diagnosis(report,'01').risk)||text(steps[2]);
  const keep=text(item.objective)||text(item.expectedImpact)||text(item.messageDirection);
  const keepDetail=list(item.channels).filter(text).slice(0,3).join(' · ');
  return `<div class="jcs-rx-grid-2"><div><h3 class="jcs-rx-subtitle">메시지 피라미드</h3><div class="jcs-rx-pyramid">${layers.map(value=>`<div>${esc(value)}</div>`).join('')}</div></div><div><h3 class="jcs-rx-subtitle">표현 운영</h3><div class="jcs-rx-language">${keep?`<div><span class="jcs-rx-label">유지</span><b>${esc(keep)}</b>${keepDetail?`<small>${esc(keepDetail)}</small>`:''}</div>`:''}${risk?`<div><span class="jcs-rx-label">축소</span><b>${esc(risk)}</b>${text(item.target)?`<small>${esc(item.target)}</small>`:''}</div>`:''}</div>${actionMarkup(item,2,1)}</div></div>`;
}

function targetMatrix(item,report){
  const strategies=[...actionRows(item),text(item.messageDirection),text(item.expectedImpact)].filter(Boolean);
  const candidates=list(display(report,'02').cohorts).filter(row=>text(row?.age)).map(row=>{
    const male=number(row.male),female=number(row.female),gender=(male??-1)>=(female??-1)?'남성':'여성',value=gender==='남성'?male:female;
    return {label:`${row.age} ${gender}`,value};
  }).filter(row=>row.value!==null).sort((a,b)=>b.value-a.value).slice(0,4);
  const states=['결집','유지','확장','회복'];
  return candidates.length?`<div class="jcs-rx-targets">${candidates.map((row,index)=>`<article><span class="jcs-rx-label">${states[index]}</span><h3>${esc(row.label)}</h3><strong>JCS ${compact(row.value)}</strong>${strategies[index]?`<p>${esc(strategies[index])}</p>`:''}</article>`).join('')}</div>`:'';
}

function localPlaybook(item,report){
  const issue=list(display(report,'03').issues).find(row=>text(row?.label)),steps=[issue?.label,...actionRows(item)].filter(text).slice(0,4),labels=['지역 문제','해결 행동','주민 체감','반복 확산'];
  return steps.length?`<div class="jcs-rx-steps">${steps.map((value,index)=>`<article class="jcs-rx-step"><span>STEP ${String(index+1).padStart(2,'0')}</span><b>${labels[index]}</b><p>${esc(value)}</p></article>`).join('')}</div>`:'';
}

function supportOrbits(report){
  const guidance={core:'성과 재확인',friendly:'참여 행동 제시',floating:'참여 행동 제시',exit:'거부 표현 축소'},rows=list(display(report,'04').composition).filter(row=>text(row?.label)&&number(row?.value)!==null).slice(0,3);
  return rows.length?`<div class="jcs-rx-orbits">${rows.map(row=>`<div class="jcs-rx-orbit" data-support-group="${esc(row.key||'group')}"><div><strong>${compact(row.value)}%</strong><b>${esc(row.label)}</b><small>${esc(guidance[row.key]||'행동 기준 구분')}</small></div></div>`).join('')}</div>`:'';
}

function rivalRows(row,index,item,subject){
  const subjectAgenda=text(list(subject?.agendas)[0]?.label)||text(item.messageDirection),agenda=text(list(row?.agendas)[0]?.label)||subjectAgenda,region=text(row?.region),gap=number(row?.competition?.gap),newsGap=number(row?.newsCount)!==null&&number(subject?.newsCount)!==null?Math.abs(Number(row.newsCount)-Number(subject.newsCount)):null,actions=actionRows(item);
  if(index===0)return [['주도',actions[0]],['방어',actions[1]],['유지',actions[2]]].filter(([,value])=>text(value));
  if(index===1)return [['공세',[subjectAgenda,'실행 결과 대조'].filter(Boolean).join(' · ')],['방어',[agenda,'지역 실행 근거 제시'].filter(Boolean).join(' · ')],['회피','경력만 앞세운 인물 공방']].filter(([,value])=>text(value));
  if(index===2)return [['공세',[region,'현장 활동량 비교'].filter(Boolean).join(' · ')],['방어',newsGap===null?'언론 주도권 격차 관리':`언론 노출 ${compact(newsGap)}건 격차 관리`],['역전',[subjectAgenda,'의제 선점'].filter(Boolean).join(' · ')]].filter(([,value])=>text(value));
  return [['공세',gap===null?'검색·보도 동시 비교':`경쟁지수 ${compact(Math.abs(gap))}p 격차 활용`],['방어',[agenda,'유동층 확장 언어 분리'].filter(Boolean).join(' · ')],['회피','근거 없는 인물 공방']];
}

function responseMatrix(item,report){
  const people=list(display(report,'05').people).filter(row=>text(row?.name)&&number(row?.competition?.index)!==null).slice(0,4),subject=people[0];
  return people.length?`<div class="jcs-rx-rivals">${people.map((row,index)=>`<article class="jcs-rx-rival${index===0?' is-subject':''}"><header><b>${esc(row.name)}</b><strong>${compact(row.competition.index)}</strong></header><dl>${rivalRows(row,index,item,subject).map(([label,value])=>`<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`).join('')}${number(row.competition.gap)!==null?`<dt>격차</dt><dd>${Number(row.competition.gap)>0?'+':''}${compact(row.competition.gap)}p</dd>`:''}</dl></article>`).join('')}</div>`:'';
}

function sparkline(daily){
  const rows=list(daily).filter(row=>number(row?.count)!==null).slice(-30),max=Math.max(0,...rows.map(row=>Number(row.count)));
  if(rows.length<2||max<=0)return '';
  const points=rows.map((row,index)=>`${(4+index*(592/(rows.length-1))).toFixed(1)},${(60-Number(row.count)/max*48).toFixed(1)}`).join(' ');
  return `<div class="jcs-rx-spark"><span class="jcs-rx-label">30일 실제 기사량 기반 지속 흐름</span><svg viewBox="0 0 600 72" role="img" aria-label="30일 실제 기사량 기반 지속 흐름"><path d="M${points.replaceAll(' ',' L')}"/></svg></div>`;
}

function crisisTimeline(item,report){
  const risk=display(report,'06'),timing=text(item.timing).split('·').map(value=>value.trim()).filter(Boolean).slice(0,4),steps=[...actionRows(item),text(item.expectedImpact)].filter(Boolean).slice(0,4);
  if(!timing.length&&!steps.length&&!list(risk?.persistence?.daily).length)return '';
  const labels=timing.length?timing:['0~6시간','24시간','72시간','7일'];
  return `<div class="jcs-rx-crisis">${labels.map((label,index)=>`<article><i></i><b>${esc(label)}</b>${steps[index]?`<p>${esc(steps[index])}</p>`:''}</article>`).join('')}</div>${sparkline(risk?.persistence?.daily)}`;
}

function pipelineNode(label,detail,value,unit=''){
  return `<div class="jcs-rx-pipeline-node"><span>${esc(label)}</span>${text(detail)?`<b>${esc(detail)}</b>`:''}${number(value)!==null?`<strong>${compact(value)}${esc(unit)}</strong>`:''}</div>`;
}

function propagationFlow(item,report){
  const media=display(report,'07'),action=display(report,'09'),agenda=list(media.agendaPenetration).find(row=>text(row?.label)),followAction=actionRows(item)[2]||item.expectedImpact;
  const nodes=[pipelineNode('원문 메시지','직접 선점',action?.initiative?.firstMover,'건'),pipelineNode('언론 보도',number(media.sourceCount)!==null?`${compact(media.sourceCount)}개 매체`:'',media.articleCount,'건'),pipelineNode('메시지 주도','본인 주도',media?.ownership?.led,'건'),pipelineNode('외부 발생','언론·상대 주도',media?.ownership?.external,'건'),pipelineNode('후속 확산',agenda?.label||followAction,agenda?.outlets,'개 매체')];
  return `<div class="jcs-rx-pipeline">${nodes.join('')}</div>`;
}

function resourceBoard(item,report){
  const rows=list(display(report,'08').foundations).filter(row=>text(row?.label)&&number(row?.value)!==null).slice(0,4),modes=['활용','방어','결집','보완'];
  if(!rows.length)return '';
  return `<div class="jcs-rx-foundations">${rows.map((row,index)=>`<article class="jcs-rx-foundation"><div><span>${modes[index]}</span><b>${esc(row.label)}</b></div><strong>${compact(row.value)}</strong></article>`).join('')}</div>${actionMarkup(item,3)}`;
}

function splitRows(rows,unit=''){
  return list(rows).filter(row=>text(row?.label)&&number(row?.value)!==null).slice(0,2).map(row=>`<span>${esc(row.label)} ${compact(row.value)}${esc(unit)}</span>`).join('');
}

function actionConversion(item,report){
  const data=display(report,'09'),composition=list(data.composition),total=number(data?.conversion?.total)??((number(data?.conversion?.led)||0)+(number(data?.conversion?.external)||0)),stages=[['관측 정치 활동',data.activityCount,'건',splitRows(composition,'%')],['행보 방식',null,'',splitRows([{label:'직접 선점',value:data?.initiative?.firstMover},{label:'이슈 합류',value:data?.initiative?.joined}],'건'),`${compact(data?.initiative?.firstMover)} / ${compact(data?.initiative?.joined)}`],['관련 보도 전환',total,'건',splitRows([{label:'본인 주도',value:data?.conversion?.led},{label:'외부 발생',value:data?.conversion?.external}],'건')]];
  return `<div class="jcs-rx-activity">${stages.map(([label,value,unit,splits,summary])=>`<div class="jcs-rx-activity-stage"><span class="jcs-rx-label">${label}</span><strong>${summary||`${compact(value)}${unit}`}</strong>${splits?`<div class="jcs-rx-split">${splits}</div>`:''}</div>`).join('')}</div>${actionMarkup(item,2)}`;
}

const commands=Object.freeze({'01':'대표 메시지 통일','02':'세대별 표현 분리','03':'지역 결과 메시지화','04':'유동층 확장 점검','05':'경쟁자 격차 재측정','06':'위기 대응 순서 고정','07':'후속 보도 흐름 구축','08':'정치 기반 강화','09':'활동 원문 선공개','10':'전체 진단 재평가'});
function integratedBoard(report){
  const groups=[['즉시 실행','immediate'],['30일 이내','days30'],['90일 관리','days90'],['중장기 축적','longTerm']];
  return `<div class="jcs-rx-board">${groups.map(([label,key])=>{const ids=list(report?.prescriptionPriorities?.[key]).filter(id=>commands[id]);return `<section class="jcs-rx-board-column"><h3>${label}</h3>${ids.map(id=>`<p><b>${esc(id)}</b> ${esc(commands[id])}</p>`).join('')}</section>`;}).join('')}</div>`;
}

const renderers={'01':messagePyramid,'02':targetMatrix,'03':localPlaybook,'04':(_item,report)=>supportOrbits(report),'05':responseMatrix,'06':crisisTimeline,'07':propagationFlow,'08':resourceBoard,'09':actionConversion,'10':(_item,report)=>integratedBoard(report)};
const layouts={'01':'message-pyramid','02':'target-matrix','03':'local-playbook','04':'support-flow','05':'response-matrix','06':'crisis-timeline','07':'propagation-flow','08':'resource-board','09':'action-conversion','10':'integrated-execution'};
const english={'01':'BRAND MESSAGE PRESCRIPTION','02':'AUDIENCE TARGET PRESCRIPTION','03':'LOCAL MESSAGE PLAYBOOK','04':'SUPPORT EXPANSION FLOW','05':'COMPETITOR RESPONSE MATRIX','06':'CRISIS RESPONSE TIMELINE','07':'MEDIA PROPAGATION FLOW','08':'CAMPAIGN PRIORITY BOARD','09':'ACTION-TO-MEDIA PRESCRIPTION','10':'JCS INTEGRATED EXECUTION'};

function chapter(item,report){
  const visual=renderers[item.id]?.(item,report)||'';
  return `<article class="jcs-rx-chapter" id="jcs-rx-${esc(item.id)}" data-prescription-topic="${esc(item.id)}" data-prescription-layout="${esc(layouts[item.id]||'execution')}"><header class="jcs-rx-head"><span class="jcs-rx-no">${esc(item.id)}</span><div><p class="jcs-rx-en">${esc(english[item.id]||'JCS STRATEGY PRESCRIPTION')}</p><h2>${esc(item.title)}</h2></div>${text(item.priority)?`<span class="jcs-rx-priority">${esc(item.priority)}</span>`:''}</header><div class="jcs-rx-judgment"><b>JCS 전략 판단</b>${text(item.strategicJudgment)?`<p>${esc(item.strategicJudgment)}</p>`:''}</div>${visual}${footer(item,item.id==='04'?'JCS 구성지수 · 실제 지지율 또는 이동률이 아님':'')}</article>`;
}

export function renderPrescriptionReport(report={}){
  const prescriptions=list(report.prescriptions).filter(row=>text(row?.id)&&text(row?.title)).slice(0,10);
  if(!prescriptions.length)return '';
  const context={...report,prescriptions};
  return `<section class="jcs-rx-report" data-prescription-report><nav class="jcs-rx-nav" aria-label="처방 항목 바로가기">${prescriptions.map(item=>`<a href="#jcs-rx-${esc(item.id)}">${esc(item.id)}</a>`).join('')}</nav><div class="jcs-rx-body">${prescriptions.map(item=>chapter(item,context)).join('')}</div></section>`;
}
