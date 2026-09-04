export const SITE_ORIGIN='https://www.jeongchamsi.com';

const MAIN_TITLE='정참시 — 정치에 참여할 시간';
const MAIN_DESCRIPTION='정치인을 데이터로 보고, 비교하고, 평가합니다. 대한민국 정치 데이터 플랫폼 JEONGCHAMSI';
const SECTION={
  column:{title:'정참시 칼럼 | JEONGCHAMSI',description:'오늘 정치에서 읽어야 할 관점과 분석을 전합니다.',brand:'JEONGCHAMSI COLUMN',image:'jcs-column.png',domain:'columns'},
  news:{title:'정참시 뉴스 | JEONGCHAMSI',description:'정참시가 정리한 오늘의 정치 뉴스와 핵심 흐름입니다.',brand:'JEONGCHAMSI NEWS',image:'jcs-news.png',domain:'news'},
  itsme:{title:"IT’S ME | JEONGCHAMSI",description:'시민의 정책과 정치 아이디어를 함께 제안합니다.',brand:"JEONGCHAMSI IT’S ME",image:'jcs-itsme.png',domain:'itsme'},
  community:{title:'정뮤니티 | JEONGCHAMSI',description:'시민들이 정치 이야기를 직접 쓰고 나누는 정참시 커뮤니티입니다.',brand:'JEONGCHAMSI COMMUNITY',image:'jcs-community.png',domain:'community'},
  academy:{title:'정참시 아카데미 | JEONGCHAMSI',description:'정치를 꿈꾸는 사람이 실제로 준비하는 정참시 교육 과정입니다.',brand:'JEONGCHAMSI ACADEMY',image:'jcs-academy.png',domain:'academy'},
  poll:{title:'정참시민 전국 평가제 | JEONGCHAMSI',description:'시민이 직접 참여하고 평가하는 정참시 공개 콘텐츠입니다.',brand:'JEONGCHAMSI CITIZEN CHOICE',image:'jcs-evaluation.png',domain:'polls'},
  'national-evaluation':{title:'정참시민 전국 평가제 | JEONGCHAMSI',description:'전국 시민이 직접 참여하는 정치인 공개 평가입니다.',brand:'JEONGCHAMSI NATIONAL EVALUATION',image:'jcs-evaluation.png',domain:'nationalEvaluation'},
  'generation-president':{title:'세대별로 대통령을 뽑는다면? | 정참시',description:'세대별 선택을 공개 데이터로 확인하는 정참시 참여 콘텐츠입니다.',brand:'JEONGCHAMSI GENERATION CHOICE',image:'jcs-generation.png',domain:'generation'},
  president:{title:'대한민국 대통령 | 정참시',description:'대한민국 대통령의 공개 정보와 정치 데이터를 확인합니다.',brand:'JEONGCHAMSI PRESIDENT',image:'jcs-president.png',domain:'president'}
};

const text=(value,max=180)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fallbackImage=file=>`${SITE_ORIGIN}/assets/og/${file}`;
const isPublished=item=>!!item&&item.published!==false&&item.visibility!=='private'&&item.status!=='draft';
const itemsOf=data=>Array.isArray(data?.items)?data.items:Array.isArray(data?.slots)?data.slots:[];
const findPublic=(data,id)=>itemsOf(data).find(item=>String(item?.id||item?.slug||'')===String(id||'')&&isPublished(item))||null;

export function publicImageUrl(value,fallback='jcs-main.png'){
  const raw=text(value?.localPath||value,1200);
  if(/^[a-z0-9-]+\.png$/i.test(raw))return fallbackImage(raw);
  if(/^\/assets\/(?!.*(?:\.\.|\\))[^?#]+\.(?:png|jpe?g|webp)(?:[?#].*)?$/i.test(raw))return `${SITE_ORIGIN}${raw}`;
  if(/^https:\/\/[^\s]+\.(?:png|jpe?g|webp)(?:[?#].*)?$/i.test(raw))return raw;
  return fallbackImage(fallback);
}

function routeUrl(route){
  const raw=String(route||'/').trim();
  const hash=raw.startsWith('#/')?raw.slice(1):raw;
  return new URL(hash.startsWith('/')?hash:`/${hash}`,SITE_ORIGIN);
}

function canonical(url,query=null){
  const target=new URL(url.pathname,SITE_ORIGIN);
  if(query)target.search=query.toString();
  return target.href;
}

function baseMeta({title=MAIN_TITLE,description=MAIN_DESCRIPTION,image='jcs-main.png',url='/',type='website',brand='JEONGCHAMSI'}){
  return {title:text(title,120)||MAIN_TITLE,description:text(description,200)||MAIN_DESCRIPTION,image:publicImageUrl(image,'jcs-main.png'),url:typeof url==='string'&&url.startsWith('https://')?url:canonical(routeUrl(url)),type,brand:text(brand,60)||'JEONGCHAMSI'};
}

function descriptionOf(item,fallback){return text(item?.summary||item?.description||item?.excerpt||item?.body,180)||fallback;}

async function contentMetadata(key,id,source,url){
  const section=SECTION[key],data=await source.readDomain?.(section.domain),item=id?findPublic(data,id):null;
  if(!item)return baseMeta({...section,image:section.image,url:url.pathname,type:'website'});
  return baseMeta({title:item.title||item.name||section.title,description:descriptionOf(item,section.description),image:item.coverImage||item.image||item.thumbnail||section.image,url:url.pathname,type:'article',brand:section.brand});
}

async function participationMetadata(key,id,source,url){
  const section=SECTION[key],data=await source.readDomain?.(section.domain),item=id?findPublic(data,id):null;
  const title=item?.title||item?.question||data?.title||section.title;
  const description=descriptionOf(item,data?.description||section.description);
  const image=item?.coverImage||item?.image||data?.coverImage||section.image;
  return baseMeta({title,description,image,url:url.pathname,type:item?'article':'website',brand:section.brand});
}

function publicPersonDescription(person){
  const profile=[person?.party,person?.office||person?.roleLabel,person?.jurisdiction||person?.region].map(value=>text(value,80)).filter(Boolean).join(' · ');
  return `${profile}${profile?' · ':''}정참시 공개 정치 데이터 요약`;
}

export async function buildShareMetadata(route='/',source={}){
  const url=routeUrl(route),parts=url.pathname.split('/').filter(Boolean),head=parts[0]||'',id=parts[1]||'';
  if(!head)return baseMeta({url:'/'});
  if(head==='person'&&id){
    const person=await source.getPolitician?.(id);
    if(!person)return baseMeta({title:'정치인 데이터 | JEONGCHAMSI',description:'정참시 정치인 공개 프로필과 정치 데이터를 확인합니다.',image:'jcs-politician.png',url:url.pathname});
    return baseMeta({title:`${text(person.name,40)} | 정참시 정치인 데이터`,description:publicPersonDescription(person),image:person.photo||person.photoUrl||'jcs-politician.png',url:url.pathname,type:'profile',brand:'JEONGCHAMSI POLITICIAN DATA'});
  }
  if(head==='compare'){
    const ids=[...new Set(String(url.searchParams.get('ids')||'').split(',').map(value=>value.trim()).filter(Boolean))].slice(0,2);
    const people=(await Promise.all(ids.map(value=>source.getPolitician?.(value)))).filter(Boolean);
    const query=new URLSearchParams();if(people.length)query.set('ids',people.map(person=>person.id).join(','));
    if(people.length===2)return baseMeta({title:`${text(people[0].name,40)} vs ${text(people[1].name,40)} | 정참시 정치인 비교`,description:`${text(people[0].name,40)}과 ${text(people[1].name,40)}의 공개 가능한 정치 데이터를 같은 기준으로 비교합니다.`,image:'jcs-compare.png',url:canonical(url,query),brand:'JEONGCHAMSI POLITICAL COMPARE'});
    return baseMeta({title:'정치인 비교분석 | 정참시',description:'정치인 두 명의 공개 데이터를 같은 기준으로 비교합니다.',image:'jcs-compare.png',url:canonical(url,query),brand:'JEONGCHAMSI POLITICAL COMPARE'});
  }
  if(['column','news','itsme','community','academy'].includes(head))return contentMetadata(head,id,source,url);
  if(['poll','national-evaluation','generation-president','president'].includes(head))return participationMetadata(head,id,source,url);
  return baseMeta({url:url.pathname});
}

export function renderShareDocument(meta,indexHtml){
  let html=String(indexHtml||'');
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(meta.title)}</title>`)
    .replace(/\s*<link[^>]+rel=["']canonical["'][^>]*>/gi,'')
    .replace(/\s*<meta[^>]+(?:property=["']og:[^"']+["']|name=["']twitter:[^"']+["'])[^>]*>/gi,'');
  const fixedImageSize=String(meta.image||'').startsWith(`${SITE_ORIGIN}/assets/og/`);
  const tags=[
    `<link rel="canonical" href="${esc(meta.url)}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:image" content="${esc(meta.image)}">`,
    ...(fixedImageSize?[`<meta property="og:image:width" content="1200">`,`<meta property="og:image:height" content="630">`]:[]),
    `<meta property="og:image:alt" content="${esc(`${meta.brand} · ${meta.title}`)}">`,
    `<meta property="og:url" content="${esc(meta.url)}">`,
    `<meta property="og:type" content="${esc(meta.type||'website')}">`,
    `<meta property="og:site_name" content="정참시 JEONGCHAMSI">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta name="twitter:image" content="${esc(meta.image)}">`
  ].join('\n  ');
  return html.replace('</head>',`  ${tags}\n</head>`);
}
