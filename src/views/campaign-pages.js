import { campaignUrl, campaignVideoId } from '../core/campaign-model.js?v=0.0.31.159';
import { renderCampaignSupport, renderCampaignProgress } from './campaign-support.js?v=0.0.31.159';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const text=value=>esc(value).replace(/\r?\n/g,'<br>');
const isAdmin=session=>session?.authenticated===true&&session?.user?.role==='admin';
const routeFor=id=>`/campaigns/${encodeURIComponent(String(id??''))}`;
const routeLink=(href,label,klass='')=>`<a${klass?` class="${klass}"`:''} href="${esc(href)}" data-layout-route="${esc(href)}">${label}</a>`;
const icon=name=>{
  const paths={right:'<path d="M5 12h14M13 6l6 6-6 6"/>',upRight:'<path d="M7 17 17 7M7 7h10v10"/>',left:'<path d="m15 18-6-6 6-6"/>',down:'<path d="m6 9 6 6 6-6"/>'};
  return `<svg class="jcs-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.right}</svg>`;
};
const numberLabel=value=>value==null||value===''?'':`#${String(value).padStart(3,'0')}`;
const dateRange=item=>item?.isExample?'예시 기간':[item?.startDate,item?.endDate].filter(Boolean).map(esc).join(' — ');
const personMeta=item=>[item?.office,(item?.category||'politics')==='politics'?item?.party:item?.organization,item?.region].filter(Boolean).map(esc).join(' · ');
const exampleLabel=item=>item?.isExample?`<span class="campaign-example-label">EXAMPLE ${esc(item.exampleNumber)}</span>`:'';
const image=item=>{const src=campaignUrl(item?.photoUrl,{local:true}),alt=esc(item?.name?`${item.name} 캠페인 사진`:'캠페인 사진'),crop=['atlas-tl','atlas-tr','atlas-bl','atlas-br'].includes(item?.photoCrop)?item.photoCrop:'';if(!src)return '';if(crop)return `<svg class="campaign-crop ${crop}" viewBox="0 0 768 512" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${alt}"><image href="${esc(src)}" width="1536" height="1024" x="${crop.endsWith('r')?-768:0}" y="${crop.includes('-b')?-512:0}" preserveAspectRatio="none"/></svg>`;return `<img data-politician-photo src="${esc(src)}" alt="${alt}" loading="lazy">`;};;
const titleOf=item=>`${text(item?.headline)}${item?.accentLine?`<br><em>${text(item.accentLine)}</em>`:''}`;

function featuredCard(item){
  if(!item)return '';
  const route=routeFor(item.id),photo=image(item),meta=personMeta(item);
  return `<a class="jcd-feature${photo?' has-photo':''}" href="${esc(route)}" data-layout-route="${esc(route)}"><div class="jcd-feature-copy"><div class="jcd-feature-edition"><span class="jcd-feature-label">대표 캠페인</span>${exampleLabel(item)}${numberLabel(item.number)?`<span>JCS ${esc(numberLabel(item.number))}</span>`:''}</div><h2 class="jcd-feature-title">${text(item.headline)}${item.accentLine?`<br><em>${text(item.accentLine)}</em>`:''}</h2>${item.topic?`<p class="jcd-feature-topic">${esc(item.topic)}</p>`:''}${item.name?`<p class="jcd-feature-person"><strong>${esc(item.name)}</strong>${meta?`<span>${meta}</span>`:''}</p>`:''}${renderCampaignProgress({funding:item.funding,compact:true})}<span class="jcd-feature-cta"><span class="jcd-cta-copy"><span>이야기를</span><span>만나보세요</span></span> ${icon('right')}</span></div>${photo?`<div class="jcd-feature-photo">${photo}${dateRange(item)?`<span class="jcd-feature-period">${dateRange(item)}</span>`:''}</div>`:''}</a>`;
}

function gridCard(item){
  const route=routeFor(item.id),photo=image(item),meta=[item.office,(item.category||'politics')==='politics'?'':item.organization,item.region].filter(Boolean).map(esc).join(' · ');
  return `<a class="jcd-item" href="${esc(route)}" data-layout-route="${esc(route)}">${photo?`<div class="jcd-portrait">${photo}${exampleLabel(item)}${numberLabel(item.number)?`<span class="jcd-number">${esc(numberLabel(item.number))}</span>`:''}${item.topic?`<span class="jcd-topic">${esc(item.topic)}</span>`:''}</div>`:''}<div class="jcd-item-body"><h3 class="jcd-item-title">${titleOf(item)}</h3>${item.name?`<div class="jcd-name-line"><strong>${esc(item.name)}</strong>${item.party?`<span class="jcd-party">${esc(item.party)}</span>`:''}</div>`:''}${meta?`<span class="jcd-role">${meta}</span>`:''}${renderCampaignProgress({funding:item.funding,compact:true})}<div class="jcd-item-bottom">${dateRange(item)?`<span>${dateRange(item)}</span>`:''}<span class="jcd-item-link"><span class="jcd-cta-copy"><span>이야기</span><span>만나보기</span></span> ${icon('upRight')}</span></div></div></a>`;
}

export const renderCampaignItemCard=item=>gridCard(item);

function archiveCard(item){
  const route=routeFor(item.id),photo=image(item),meta=[item.name,item.office,item.party,item.region].filter(Boolean).map(esc).join(' · ');
  return `<a class="jcd-record" href="${esc(route)}" data-layout-route="${esc(route)}">${photo?`<div class="jcd-portrait">${photo}</div>`:''}<div class="jcd-record-copy"><div class="jcd-record-meta">${numberLabel(item.number)?`<span>JCS CAMPAIGN ${esc(numberLabel(item.number))}</span>`:''}<span class="jcd-ended">종료</span></div><h3 class="jcd-record-title">${titleOf(item)}</h3>${meta?`<p class="jcd-record-person">${meta}</p>`:''}<span class="jcd-item-link">${dateRange(item)?`${dateRange(item)} · `:''}당시 이야기 읽기 ${icon('upRight')}</span></div></a>`;
}

function manageCard(item){
  const route=`${routeFor(item.id)}/edit`,state={current:'게시 중',archive:'종료',draft:'초안',private:'비공개',scheduled:'공개 예정'}[item.state]||esc(item.state||'초안');
  return `<article class="jcd-manage-row"><div><span class="jcd-manage-state">${state}</span>${exampleLabel(item)}<h2>${esc(item.draftHeadline||item.headline||'제목 없는 초안')}</h2><p>${item.version!=null?`버전 ${esc(item.version)}`:''}</p></div>${routeLink(route,`수정 ${icon('right')}`,'jcd-admin-link')}</article>`;
}

export function renderCampaignBoard(result,session={},view='current',category='all'){
  const selected=['current','archive','manage'].includes(view)?view:'current';
  const admin=isAdmin(session);
  if(selected==='manage'&&!admin)return `<main id="jcs-campaign-directory"><section class="jcd-state" role="alert"><h1>접근할 수 없습니다.</h1><p>캠페인 관리는 관리자만 이용할 수 있습니다.</p></section></main>`;
  const controls=admin?`<div class="jcd-admin-controls">${routeLink('/campaigns/write','캠페인 등록','jcd-admin-link')}${routeLink('/campaigns?view=manage','캠페인 관리','jcd-admin-link')}</div>`:'';
  if(!result?.ok)return `<main id="jcs-campaign-directory"><div class="jcd-top"><span class="jcd-crumb">정참시 / <b>CAMPAIGN 전체보기</b></span>${controls}</div><section class="jcd-state" role="alert"><h1>캠페인을 불러오지 못했습니다.</h1><p>${esc(result?.error||'잠시 후 다시 시도해주세요.')}</p></section></main>`;
  const all=Array.isArray(result.items)?result.items:[],featured=result.featured||null;
  const items=all.filter(item=>!featured||String(item?.id)!==String(featured.id));
  const currentCount=Number(result.counts?.current||0),archiveCount=Number(result.counts?.archive||0);
  const page=Math.max(1,Number.parseInt(result.page,10)||1);
  const pageRoute=number=>{const query=new URLSearchParams();if(selected!=='current')query.set('view',selected);if(category!=='all')query.set('category',category);query.set('page',String(number));return `/campaigns?${query}`;};
  const pagination=page>1||result.hasMore===true?`<nav class="jcd-pagination" aria-label="캠페인 페이지">${page>1?routeLink(pageRoute(page-1),`${icon('left')} 이전`,'jcd-page-link'):''}<span>${page} 페이지</span>${result.hasMore===true?routeLink(pageRoute(page+1),`다음 ${icon('right')}`,'jcd-page-link'):''}</nav>`:'';
  const categoryTabs=`<nav class="campaign-category-tabs" aria-label="캠페인 분야">${[['all','전체'],['politics','정치'],['culture','문화·예술'],['business','비즈니스·스타트업']].map(([key,label])=>routeLink(`/campaigns?${new URLSearchParams({...((selected!=='current')?{view:selected}:{}),...((key!=='all')?{category:key}:{})})}`,label,key===category?'is-active':'')).join('')}</nav>`;
  const tabs=`<nav class="jcd-tabs" aria-label="캠페인 목록 선택">${routeLink(category==='all'?'/campaigns':`/campaigns?category=${category}`,`진행 중 <span class="jcd-count">${currentCount}</span>`,selected==='current'?'jcd-tab is-active':'jcd-tab')}${routeLink(`/campaigns?view=archive${category==='all'?'':`&category=${category}`}`,`ARCHIVE <span class="jcd-count">${archiveCount}</span>`,selected==='archive'?'jcd-tab is-active':'jcd-tab')}</nav>`;
  let body='';
  if(selected==='archive'){
    const groups=new Map();for(const item of items){const month=/^\d{4}-\d{2}/.exec(String(item?.endDate||''))?.[0]?.replace('-','.')||'기간 미등록';if(!groups.has(month))groups.set(month,[]);groups.get(month).push(item);}
    body=`<section class="jcd-archive-lead"><span class="jcd-eyebrow">CAMPAIGN ARCHIVE</span><h2>처음 발견한 가능성을,<br>오래 남는 기록으로.</h2><p>종료된 캠페인의 기록입니다. 당시의 정책과 이야기는 계속 열람할 수 있습니다.</p></section>${items.length?[...groups].map(([month,rows])=>`<section class="jcd-archive-group"><p class="jcd-year">${month}</p><div class="jcd-records">${rows.map(archiveCard).join('')}</div></section>`).join(''):'<div class="jcd-state"><p>종료된 캠페인 기록이 아직 없습니다.</p></div>'}`;
  }
  else if(selected==='manage')body=`<section class="jcd-archive-lead"><span class="jcd-eyebrow">CAMPAIGN MANAGEMENT</span><h2>캠페인 관리</h2></section>${items.length?`<div class="jcd-manage-list">${items.map(manageCard).join('')}</div>`:'<div class="jcd-state"><p>관리할 캠페인이 아직 없습니다.</p></div>'}`;
  else body=`${featuredCard(featured)}${items.length?`<div class="jcd-section-head"><h2>함께 살펴볼 캠페인</h2><span>진행 중인 다른 이야기 ${items.length}건</span></div><div class="jcd-grid">${items.map(gridCard).join('')}</div>`:featured?'':'<div class="jcd-state"><p>공개된 캠페인이 아직 없습니다.</p></div>'}${archiveCount?`<div class="jcd-archive-invite"><div><small>CAMPAIGN ARCHIVE</small><h2>캠페인은 끝나도,<br>기록은 남습니다.</h2></div>${routeLink(`/campaigns?view=archive${category==='all'?'':`&category=${category}`}`,`지난 이야기 ${archiveCount}건 ${icon('right')}`,'jcd-archive-link')}</div>`:''}`;
  return `<main id="jcs-campaign-directory"><div class="jcd-top"><span class="jcd-crumb">정참시 / <b>CAMPAIGN 전체보기</b></span>${controls}</div><header class="jcd-introduction"><span class="jcd-eyebrow">PEOPLE · PROJECTS · POSSIBILITY</span><h1 class="jcd-heading">정참시 <em>CAMPAIGN</em></h1><p class="jcd-lead">사람과 프로젝트의 생각에서, 우리 사회의 다음 가능성으로.<br>정책과 활동, 사업과 이야기를 살펴보고 여러분의 기준으로 판단해주세요.</p></header>${selected==='manage'?'':tabs}<div class="jcd-content">${selected==='manage'?'':categoryTabs+'<p class="campaign-examples-notice">화면 이해를 돕기 위한 허구의 예시 캠페인이 포함되어 있습니다.</p>'}${body}${pagination}</div><footer class="jcd-footer"><p class="jcd-principle">${category==='politics'?'정참시는 정당을 보고 사람을 선택하지 않습니다.<br><strong>아직 충분한 기회를 얻지 못한 정치와 정책을 발견합니다.</strong>':'정참시는 아직 충분한 기회를 얻지 못한 사람과 프로젝트의 가능성을 발견합니다.'}</p></footer></main>`;
}

function videoEmbed(value){
  const id=campaignVideoId(value);
  return id?`<div class="jcs-video"><iframe src="https://www.youtube.com/embed/${esc(id)}" title="캠페인 영상" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`:'';
}

export function renderCampaignDetail(item,session={}){
  if(!item||!item.id)return `<main id="jcs-campaign-preview"><section class="jcd-state" role="alert"><h1>캠페인을 찾을 수 없습니다.</h1></section></main>`;
  const route=routeFor(item.id),meta=personMeta(item),photo=image(item),admin=isAdmin(session),category=item.category||'politics',labels=category==='culture'?{story:'작품 · 활동',policy:'작품 · 활동'}:category==='business'?{story:'기업 · 창업',policy:'기업 · 창업'}:{story:'POLITICIAN STORY',policy:'POLICY'};
  const relationLabel={editorial:'자체 기획',commissioned:'의뢰 제작',ad:'광고'}[item.productionRelation]||'';
  const why=item.whyTitle||item.whyBody||item.selectionReason?`<section class="jcs-section" id="jcs-campaign-why"><div class="jcs-kicker"><span>01</span> WHY THIS CAMPAIGN</div>${item.whyTitle?`<h2>${text(item.whyTitle)}</h2>`:''}${item.whyBody?`<p class="jcs-body-copy">${text(item.whyBody)}</p>`:''}${item.selectionReason?`<div class="jcs-selection"><p>${text(item.selectionReason)}</p></div>`:''}${relationLabel||item.productionDisclosure?`<div class="jcs-disclosure">${relationLabel?`<span>${relationLabel}</span>`:''}${item.productionDisclosure?text(item.productionDisclosure):''}</div>`:''}</section>`:'';
  const story=item.quote||item.storyBody||item.needsBody?`<section class="jcs-section" id="jcs-campaign-story"><div class="jcs-kicker"><span>02</span> ${labels.story}</div>${item.quote?`<blockquote class="jcs-quote">${text(item.quote)}${item.name?`<cite>${esc(item.name)}</cite>`:''}</blockquote>`:''}${item.storyBody?`<p class="jcs-body-copy">${text(item.storyBody)}</p>`:''}${item.needsBody?`<details class="jcs-story-fold"><summary>이 제안에 지금 필요한 것은 무엇인가요?</summary><p>${text(item.needsBody)}</p></details>`:''}</section>`:'';
  const policies=Array.isArray(item.policies)?item.policies.filter(row=>row?.title||row?.body):[];
  const proposalNoun=category==='culture'?'작품과 활동':category==='business'?'기업과 창업 제안':'정책';
  const policy=item.policyTitle||policies.length?`<section class="jcs-section" id="jcs-campaign-policy"><div class="jcs-kicker"><span>03</span> ${labels.policy}</div>${item.policyTitle?`<h2>${text(item.policyTitle)}</h2>`:''}${policies.length?`<p class="jcs-body-copy">${policies.length===3?`이번 캠페인에서 함께 살펴볼 ${proposalNoun}의 세 가지 방향입니다.`:`이번 캠페인에서 함께 살펴볼 ${proposalNoun}의 방향입니다.`}</p><ol class="jcs-policy-list">${policies.map((row,index)=>`<li><span class="jcs-policy-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><div>${row.title?`<h3>${text(row.title)}</h3>`:''}${row.body?`<p>${text(row.body)}</p>`:''}</div></li>`).join('')}</ol>`:''}<div class="jcs-judgment"><strong>${category==='politics'?'정책을 살펴보고, 판단은 시민이 합니다.':'활동과 제안을 살펴보고, 판단은 여러분이 합니다.'}</strong>${category==='politics'?'정참시는 소개된 정치인의 모든 견해에 동의를 요구하지 않습니다. 이번 캠페인의 정책과 활동을 살펴보고, 여러분의 기준으로 판단해주세요.':'정참시는 소개된 사람이나 프로젝트의 모든 선택에 동의를 요구하지 않습니다. 활동과 제안을 살펴보고 여러분의 기준으로 판단해주세요.'}</div></section>`:'';
  const sources=(Array.isArray(item.sources)?item.sources:[]).map(row=>({label:row?.label,url:campaignUrl(row?.url)})).filter(row=>row.label&&row.url);
  const sourceBlock=sources.length?`<section class="jcs-section jcs-sources"><div class="jcs-kicker">SOURCES</div><ul>${sources.map(row=>`<li><a href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">${esc(row.label)} ${icon('upRight')}</a></li>`).join('')}</ul></section>`:'';
  const supportBlock=renderCampaignSupport(item);
  return `<main id="jcs-campaign-preview"><div class="jcs-topline"><div class="jcs-crumb">${routeLink('/campaigns',`${icon('left')} 캠페인 전체보기`)}</div>${admin?routeLink(`${route}/edit`,'캠페인 수정','jcd-admin-link'):''}</div>${item.state==='archive'?'<p class="jcd-detail-ended">종료된 캠페인의 기록입니다. 당시의 정책과 이야기를 보존합니다.</p>':''}<section class="jcs-hero" aria-label="캠페인 소개"><div class="jcs-hero-copy">${exampleLabel(item)}${numberLabel(item.number)?`<div class="jcs-edition"><span class="jcs-edition-line" aria-hidden="true"></span>JCS CAMPAIGN ${esc(numberLabel(item.number))}</div>`:''}<h1>${text(item.headline)}${item.accentLine?`<br><em>${text(item.accentLine)}</em>`:''}</h1>${item.intro?`<p class="jcs-intro">${text(item.intro)}</p>`:''}${item.name?`<div class="jcs-person"><strong>${esc(item.name)}</strong>${meta?`<span>${meta}</span>`:''}</div>`:''}${why?`<a class="jcs-read" href="#jcs-campaign-why">정책과 이야기 읽기 ${icon('down')}</a>`:''}</div>${photo?`<figure class="jcs-photo">${photo}</figure>`:''}</section>${item.topic||dateRange(item)?`<div class="jcs-meta">${item.topic?`<span class="jcs-meta-topic">${esc(item.topic)}</span>`:''}${dateRange(item)?`<span>${dateRange(item)}</span>`:''}</div>`:''}${item.isExample?'<p class="campaign-example-notice">이 캠페인은 화면 이해를 위한 허구의 예시입니다.</p>':''}<div class="jcs-article">${why}${story}${policy}${videoEmbed(item.videoUrl)}${sourceBlock}${supportBlock}<p class="jcs-principle">${category==='politics'?'정참시는 정당을 보고 사람을 선택하지 않습니다.<br><b>아직 충분한 기회를 얻지 못한 정치와 정책을 발견합니다.</b>':'정참시는 아직 충분한 기회를 얻지 못한 사람과 프로젝트의 가능성을 발견합니다.'}</p></div><div class="jcs-bottomline"><span>정참시 CAMPAIGN</span></div></main>`;
}
