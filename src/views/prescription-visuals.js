const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):null;
const compact=value=>number(value)===null?'':Number(value).toLocaleString('ko-KR');
const diagnosis=(report,id)=>list(report?.diagnoses).find(row=>row?.id===id)||{};
const display=(report,id)=>diagnosis(report,id)?.display||{};
const nonEmpty=value=>text(value)?`<p>${esc(value)}</p>`:'';
const linked=item=>list(item?.linkedDiagnosisIds).filter(Boolean).map(id=>`<b>진단 ${esc(id)}</b>`).join('');
const actions=item=>list(item?.actions).filter(text).map((label,index)=>`<div><span>${index+1}</span><p>${esc(label)}</p></div>`).join('');
const evidence=item=>list(item?.sourceFindings).filter(text).map(value=>`<li>${esc(value)}</li>`).join('');
const monitoring=item=>list(item?.monitoringIndicators).filter(text).map(value=>`<span>${esc(value)}</span>`).join('');
const channels=item=>list(item?.channels).filter(text).map(value=>`<span>${esc(value)}</span>`).join('');
const valueNode=(label,value,unit='')=>number(value)===null?'':`<div class="jcs-rx-node"><span>${esc(label)}</span><strong>${compact(value)}${esc(unit)}</strong></div>`;

function pyramid(item){
  const layers=[item.messageDirection,item.target,list(item.actions)[0]].filter(text);
  return layers.length?`<div class="jcs-rx-pyramid">${layers.map((value,index)=>`<div data-rx-level="${index+1}">${esc(value)}</div>`).join('')}</div>`:'';
}

function targetMatrix(item,report){
  const rows=list(display(report,'02').cohorts).filter(row=>text(row?.age)&&number(row?.total)!==null).sort((a,b)=>Number(b.total)-Number(a.total)).slice(0,4),states=['결집','유지','확장','회복'];
  return rows.length?`<div class="jcs-rx-targets">${rows.map((row,index)=>`<article><span>${states[index]}</span><h4>${esc(row.age)}</h4><strong>JCS ${compact(row.total)}</strong>${number(row.male)!==null&&number(row.female)!==null?`<p>남 ${compact(row.male)} · 여 ${compact(row.female)}</p>`:''}</article>`).join('')}</div>`:'';
}

function localPlaybook(item,report){
  const local=display(report,'03'),issue=list(local.issues).find(row=>text(row?.label)),stages=[issue?.label||'',list(item.actions)[0],list(item.actions)[1],list(item.actions)[2]].filter(text);
  const labels=['지역 문제','해결 행동','주민 체감','반복 확산'];
  return stages.length?`<div class="jcs-rx-steps">${stages.map((value,index)=>`<article><span>STEP ${String(index+1).padStart(2,'0')}</span><b>${labels[index]}</b><p>${esc(value)}</p></article>`).join('')}</div>`:'';
}

function supportFlow(report){
  const rows=list(display(report,'04').composition).filter(row=>text(row?.label)&&number(row?.value)!==null);
  return rows.length?`<div class="jcs-rx-support">${rows.map(row=>`<div class="is-${esc(row.key||'group')}"><strong>${compact(row.value)}%</strong><b>${esc(row.label)}</b></div>`).join('')}</div>`:'';
}

function responseMatrix(item,report){
  const people=list(display(report,'05').people).filter(row=>text(row?.name)&&number(row?.competition?.index)!==null).slice(0,4),prescribed=list(item.actions).filter(text);
  return people.length?`<div class="jcs-rx-rivals">${people.map((row,index)=>{const gap=number(row.competition?.gap),labels=index===0?['주도','방어','유지']:['공세','방어','회피'];return `<article${index===0?' class="is-subject"':''}><header><b>${esc(row.name)}</b><strong>${compact(row.competition.index)}</strong></header><dl>${prescribed.slice(0,3).map((value,actionIndex)=>`<dt>${labels[actionIndex]}</dt><dd>${esc(value)}</dd>`).join('')}${gap!==null?`<dt>격차</dt><dd>${gap>0?'+':''}${compact(gap)}p</dd>`:''}</dl></article>`;}).join('')}</div>`:'';
}

function crisisTimeline(item,report){
  const stages=text(item.timing).split('·').map(value=>value.trim()).filter(Boolean),steps=list(item.actions).filter(text),risk=display(report,'06'),hasRisk=text(risk?.persistence?.shape);
  if(!stages.length&&!steps.length&&!hasRisk)return '';
  return `${hasRisk?`<p class="jcs-rx-risk-shape">${esc(risk.persistence.shape)}${number(risk.persistence.reignitionCount)!==null?` · 재점화 ${compact(risk.persistence.reignitionCount)}회`:''}</p>`:''}<div class="jcs-rx-timeline">${stages.map((stage,index)=>`<article><i></i><b>${esc(stage)}</b>${nonEmpty(steps[index])}</article>`).join('')}</div>`;
}

function propagationFlow(report){
  const media=display(report,'07'),nodes=[];
  if(number(media.articleCount)>0)nodes.push(['언론 보도',media.articleCount,'건']);
  if(number(media.sourceCount)>0)nodes.push(['보도 매체',media.sourceCount,'개']);
  if(number(media.ownership?.led)>0)nodes.push(['본인 주도',media.ownership.led,'건']);
  if(number(media.ownership?.external)>0)nodes.push(['외부 발생',media.ownership.external,'건']);
  const agenda=list(media.agendaPenetration).find(row=>text(row?.label)&&number(row?.articles)>0);
  if(agenda)nodes.unshift([agenda.label,agenda.articles,'건']);
  return nodes.length?`<div class="jcs-rx-pipeline">${nodes.map(([label,value,unit])=>valueNode(label,value,unit)).join('')}</div>`:'';
}

function resourceBoard(report){
  const rows=list(display(report,'08').foundations).filter(row=>text(row?.label)&&number(row?.value)!==null),modes=['활용','방어','결집','보완'];
  return rows.length?`<div class="jcs-rx-foundations">${rows.map((row,index)=>`<article><div><span>${modes[index]||'관리'}</span><b>${esc(row.label)}</b></div><strong>${compact(row.value)}</strong></article>`).join('')}</div>`:'';
}

function actionConversion(report){
  const data=display(report,'09'),nodes=[];
  if(number(data.activityCount)>0)nodes.push(['관측 정치 활동',data.activityCount,'건']);
  if(number(data.initiative?.firstMover)>0)nodes.push(['직접 선점',data.initiative.firstMover,'건']);
  if(number(data.initiative?.joined)>0)nodes.push(['이슈 합류',data.initiative.joined,'건']);
  if(number(data.conversion?.led)>0)nodes.push(['본인 주도 보도',data.conversion.led,'건']);
  if(number(data.conversion?.external)>0)nodes.push(['외부 발생 보도',data.conversion.external,'건']);
  return nodes.length?`<div class="jcs-rx-action-flow">${nodes.map(([label,value,unit])=>valueNode(label,value,unit)).join('')}</div>`:'';
}

function integratedBoard(report){
  const titles=new Map(list(report?.prescriptions).map(row=>[row.id,row.title])),groups=[['즉시 실행','immediate'],['30일 이내','days30'],['90일 관리','days90'],['중장기 축적','longTerm']];
  const columns=groups.map(([label,key])=>{const ids=list(report?.prescriptionPriorities?.[key]).filter(id=>titles.has(id));return ids.length?`<section><h4>${label}</h4>${ids.map(id=>`<p><b>${esc(id)}</b>${esc(titles.get(id))}</p>`).join('')}</section>`:'';}).filter(Boolean);
  return columns.length?`<div class="jcs-rx-board">${columns.join('')}</div>`:'';
}

const renderers={
  '01':pyramid,
  '02':targetMatrix,
  '03':localPlaybook,
  '04':(_item,report)=>supportFlow(report),
  '05':responseMatrix,
  '06':crisisTimeline,
  '07':(_item,report)=>propagationFlow(report),
  '08':(_item,report)=>resourceBoard(report),
  '09':(_item,report)=>actionConversion(report),
  '10':(_item,report)=>integratedBoard(report)
};
const layouts={
  '01':'message-pyramid','02':'target-matrix','03':'local-playbook','04':'support-flow','05':'response-matrix',
  '06':'crisis-timeline','07':'propagation-flow','08':'resource-board','09':'action-conversion','10':'integrated-execution'
};
const english={
  '01':'BRAND MESSAGE PRESCRIPTION','02':'AUDIENCE TARGET PRESCRIPTION','03':'LOCAL MESSAGE PLAYBOOK','04':'SUPPORT EXPANSION FLOW','05':'COMPETITOR RESPONSE MATRIX',
  '06':'CRISIS RESPONSE TIMELINE','07':'MEDIA PROPAGATION FLOW','08':'CAMPAIGN PRIORITY BOARD','09':'ACTION-TO-MEDIA PRESCRIPTION','10':'JCS INTEGRATED EXECUTION'
};

function chapter(item,report){
  const visual=renderers[item.id]?.(item,report)||'',actionMarkup=actions(item),sourceMarkup=evidence(item),channelMarkup=channels(item),monitorMarkup=monitoring(item);
  return `<article class="jcs-rx-chapter" id="jcs-rx-${esc(item.id)}" data-prescription-topic="${esc(item.id)}" data-prescription-layout="${esc(layouts[item.id]||'execution')}"><header class="jcs-chapter-head jcs-rx-head"><span class="jcs-no">${esc(item.id)}</span><div><h2>${esc(item.title)}</h2><p class="jcs-en">${esc(english[item.id]||'JCS STRATEGY PRESCRIPTION')}</p></div>${text(item.priority)?`<span class="jcs-rx-priority">${esc(item.priority)}</span>`:''}</header><div class="jcs-rx-judgment"><b>JCS 전략 판단</b>${nonEmpty(item.strategicJudgment)}</div>${visual?`<div class="jcs-rx-visual">${visual}</div>`:''}${actionMarkup?`<section class="jcs-rx-actions"><h3>실행 행동</h3>${actionMarkup}</section>`:''}${sourceMarkup?`<section class="jcs-rx-source" data-rx-source-findings><h3>진단 근거</h3><ul>${sourceMarkup}</ul></section>`:''}${channelMarkup?`<div class="jcs-rx-channels" data-rx-channels><b>실행 채널</b>${channelMarkup}</div>`:''}<footer class="jcs-rx-foot">${linked(item)?`<div class="jcs-rx-links">${linked(item)}</div>`:''}${monitorMarkup?`<div class="jcs-rx-monitoring" data-rx-monitoring><b>추적</b>${monitorMarkup}</div>`:''}</footer></article>`;
}

export function renderPrescriptionReport(report={}){
  const prescriptions=list(report.prescriptions).filter(row=>text(row?.id)&&text(row?.title)).slice(0,10);
  if(!prescriptions.length)return '';
  return `<section class="jcs-rx-report" data-prescription-report><nav class="jcs-rx-nav" aria-label="처방 항목 바로가기">${prescriptions.map(item=>`<a href="#jcs-rx-${esc(item.id)}">${esc(item.id)}</a>`).join('')}</nav>${prescriptions.map(item=>chapter(item,{...report,prescriptions})).join('')}</section>`;
}
