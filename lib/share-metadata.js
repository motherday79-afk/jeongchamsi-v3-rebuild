export const SITE_ORIGIN='https://www.jeongchamsi.com';

const MAIN_TITLE='정참시 — 정치에 참여할 시간';
const MAIN_DESCRIPTION='정치인을 데이터로 보고, 비교하고, 평가합니다. 대한민국 정치 데이터 플랫폼 JEONGCHAMSI';
const SECTION={
  column:{title:'정참시 칼럼 | JEONGCHAMSI',description:'오늘 정치에서 읽어야 할 관점과 분석을 전합니다.',brand:'JEONGCHAMSI COLUMN',image:'jcs-column.png',domain:'columns'},
  news:{title:'정참시 뉴스 | JEONGCHAMSI',description:'정참시가 정리한 오늘의 정치 뉴스와 핵심 흐름입니다.',brand:'JEONGCHAMSI NEWS',image:'jcs-news.png',domain:'news'},
  itsme:{title:"IT’S ME | JEONGCHAMSI",description:'시민의 정책과 정치 아이디어를 함께 제안합니다.',brand:"JEONGCHAMSI IT’S ME",image:'jcs-itsme.png',domain:'itsme'},
  community:{title:'정뮤니티 | JEONGCHAMSI',description:'시민들이 정치 이야기를 직접 쓰고 나누는 정참시 커뮤니티입니다.',brand:'JEONGCHAMSI COMMUNITY',image:'jcs-community.png',domain:'community'},
  poll:{title:'시티즌 초이스 | JEONGCHAMSI',description:'오늘의 쟁점에 시민이 직접 한 표를 보탭니다.',brand:'JEONGCHAMSI CITIZEN CHOICE',image:'jcs-poll-377.png',domain:'polls'},
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
  const raw=text(value?.url||value?.localPath||value,1200);
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
  if(head==='political-map')return baseMeta({title:'대한민국 정치지도 | 정참시',description:'지역별 정당 구성과 국회의원·광역단체장·기초단체장 현황을 한눈에 확인하세요.',image:'/assets/og/jcs-political-map-391.png',url:url.pathname});
  if(head==='political-comic'){
    const data=await source.readComics?.(),item=id?findPublic(data,id):null;
    return baseMeta({title:item?.title||'정치4컷 | 정참시',description:item?'네 컷의 만화로 이해하는 오늘의 이슈':'복잡한 이슈를 쉽고 빠르게 읽는 정참시 정치4컷',image:item?.coverImage||item?.image||'jcs-comic-377.png',url:url.pathname,type:item?'article':'website'});
  }
  const sections={
    'ai-panel':['JCS 여론조사','정참시·한국갤럽·리얼미터·NBS 여론조사를 확인하세요.','survey'],
    now:['나우랭크','지금 주목받는 정치인을 정참시 나우랭크에서 만나보세요.','now'],
    shop:['정참시 쇼핑몰','당신의 목소리에 빛을 더하는 정참시 굿즈','shop'],
    groups:['정참시 모임','관심사가 같은 사람들과 함께하는 공간','groups'],
    campaigns:['정참시 캠페인','사람과 프로젝트의 가능성을 발견합니다.','campaign'],
    points:['정참시 포인트','참여로 쌓는 정참시 포인트','points'],
    support:['정참시 응원','함께 만드는 정참시','points'],
    about:['정참시 소개','정치에 참여할 시간, 정참시','main'],
    mine:['사라진 보물을 찾아서','정참시 골드 마인으로 초대합니다.','mine']
  };
  if(sections[head]){
    const [title,description,image]=sections[head],item=head==='shop'&&id?await source.getProduct?.(id):null;
    const query=new URLSearchParams();for(const key of ['tab','panel','id','period','publisher','category','view'])if(url.searchParams.has(key))query.set(key,url.searchParams.get(key));
    return baseMeta({title:item?.name||title,description,image:item?.banner||item?.image||`jcs-${image}-377.png`,url:canonical(url,query),type:item?'product':'website'});
  }
  if(head==='person'&&id){
    const person=await source.getPolitician?.(id);
    if(!person)return baseMeta({title:'정치인 데이터 | JEONGCHAMSI',description:'정참시 정치인 공개 프로필과 정치 데이터를 확인합니다.',image:'jcs-politician.png',url:url.pathname});
    return baseMeta({title:`${text(person.name,40)} | 정참시 정치인 데이터`,description:publicPersonDescription(person),image:person.photo||person.photoUrl||'jcs-politician.png',url:url.pathname,type:'profile',brand:'JEONGCHAMSI POLITICIAN DATA'});
  }
  if(head==='compare'){
    const ids=[...new Set(String(url.searchParams.get('ids')||'').split(',').map(value=>value.trim()).filter(Boolean))].slice(0,4);
    const people=(await Promise.all(ids.map(value=>source.getPolitician?.(value)))).filter(Boolean);
    const query=new URLSearchParams();if(people.length)query.set('ids',people.map(person=>person.id).join(','));
    if(people.length>=2)return baseMeta({title:`${people.map(p=>text(p.name,25)).join(' vs ')} | 정참시 정치인 비교`,description:`${people.map(p=>text(p.name,25)).join(' · ')}의 공개 정치 데이터를 같은 기준으로 비교합니다.`,image:'jcs-compare.png',url:canonical(url,query),brand:'JEONGCHAMSI POLITICAL COMPARE'});
    return baseMeta({title:'정치인 비교분석 | 정참시',description:'정치인 두 명의 공개 데이터를 같은 기준으로 비교합니다.',image:'jcs-compare.png',url:canonical(url,query),brand:'JEONGCHAMSI POLITICAL COMPARE'});
  }
  if(['column','news','itsme','community'].includes(head))return contentMetadata(head,id,source,url);
  if(['poll','generation-president','president'].includes(head))return participationMetadata(head,id,source,url);
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
