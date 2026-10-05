import {MAP_REGIONS,MAP_DISTRICTS} from '../data/political-map-geometry.js?v=0.0.31.391';
import {politicalMapSummary,normalizeRegion,normalizeParty} from '../core/political-map-model.js?v=0.0.31.391';
import {districtCity,districtLabelGroups,layoutRegionLabels,minimumRegionLabelZoom,REGION_LABEL_FONT} from './political-map-labels.js?v=0.0.31.450';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={all:'전체',assembly:'국회의원',metropolitan:'광역단체장',basic:'기초단체장'};
export function districtMembers(items,district){
 return items.filter(p=>{
  if(normalizeRegion(p)!==district.region)return false;
  if(p.type==='metropolitan')return true;
  const local=String(p.jurisdiction||'').replace(/^(서울특별시|부산광역시|대구광역시|인천광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전남광주통합특별시|전라남도|광주광역시|경상북도|경상남도|제주특별자치도)\s*/, '').replace(/^(서울|부산|대구|인천|대전|울산|세종|경기|강원|충북|충남|전북|전남광주|전남|광주|경북|경남|제주)\s+/, '').replace(/\s/g,'');
  if(p.type!=='assembly')return !!local&&(local===district.name||district.name.startsWith(local)&&local.endsWith('시'));
  if(district.region==='세종')return true;
  // Match complete administrative names, including combined constituencies.
  const hasArea=name=>{let at=local.indexOf(name);while(at>=0){if(at===0||/[시군구]/.test(local[at-1]))return true;at=local.indexOf(name,at+1);}return false;};
  if(hasArea(district.name))return true;
  // Constituencies named only by city cannot be assigned to individual wards.
  // Show that city's combined delegation on its wards instead of inventing boundaries.
  const city=district.name.match(/^(.+시).+구$/)?.[1];
  return !!city&&hasArea(city)&&!local.slice(local.indexOf(city)+city.length).replace(/[갑을병정무기]$/,'').includes('구');
 });
}
export function renderRegionStage(data,state,color,navigator=''){
 const region=MAP_REGIONS.find(r=>r.name===state.region);
 const regional=politicalMapSummary(data.items,{type:state.type,region:state.region});
 const districts=MAP_DISTRICTS.filter(d=>d.region===state.region);
 const cityGroup=districtLabelGroups(districts).find(g=>g.city&&g.name===state.city);
 const focusedDistricts=cityGroup?cityGroup.members:districts;
 const district=districts.find(d=>d.name===state.local);
 const localItems=district?districtMembers(regional.items,district):cityGroup?regional.items.filter(p=>focusedDistricts.some(d=>districtMembers([p],d).length)):regional.items;
 const summary=politicalMapSummary(localItems);
 const people=localItems.filter(p=>(state.party==='all'||(p.isVacant?'공석':normalizeParty(p.party))===state.party)&&(!state.district||state.district===p.id)&&(!state.q||(p.name+' '+p.jurisdiction).includes(state.q)));
 let defs='',paths='';
 const shapes=focusedDistricts.length?focusedDistricts:region?[region]:[];
 for(const [i,d] of shapes.entries()){
  const stats=d.region?politicalMapSummary(districtMembers(regional.items,d)):regional;
  const id='pmap-local-'+i;let offset=0;
  defs+='<linearGradient id="'+id+'">'+stats.parties.map(p=>{const start=offset;offset+=p.share*100;const paint=state.party!=='all'&&state.party!==p.party?'#526075':color(p.party);return '<stop offset="'+start+'%" stop-color="'+paint+'"/><stop offset="'+offset+'%" stop-color="'+paint+'"/>';}).join('')+'</linearGradient>';
  const parent=districtCity(d.name),action=!cityGroup&&parent!==d.name?'data-map-city="'+esc(parent)+'"':'data-map-local="'+esc(d.name)+'"';
  paths+='<path d="'+d.d+'" fill="'+(stats.total?'url(#'+id+')':'#475469')+'" '+action+' role="button" tabindex="0" aria-label="'+esc(d.name+' · '+stats.total+'명')+'" class="'+(state.local===d.name?'is-selected':'')+'"><title>'+esc(d.name+' · '+stats.parties.map(p=>p.party+' '+p.count+'명').join(', '))+'</title></path>';
 }
 const b=cityGroup?.bounds||region?.bounds,box=b?[b[0]-4,b[1]-4,b[2]+8,b[3]+8].join(' '):'0 0 600 700';
 const selectedName=district?.name||cityGroup?.name||'지역 전체';
 const mapMarkup=`<div class="pmap-region-map pmap-readable-map"><div class="pmap-map-controls"><div>${cityGroup?`<button type="button" data-map-city-back>← ${esc(state.region)} 전체</button><strong>${esc(cityGroup.name)}</strong>`:'<strong>시·군·구 지도</strong>'}</div><div role="group" aria-label="지도 확대 축소"><button type="button" data-map-detail-zoom="out" aria-label="지도 축소">−</button><button type="button" data-map-detail-zoom="reset">기본</button><button type="button" data-map-detail-zoom="in" aria-label="지도 확대">+</button></div></div><div class="pmap-region-viewport" tabindex="0" role="region" aria-label="${esc(state.region)} 지도 · 좌우와 위아래로 이동 가능"><svg data-region-labels="${esc(state.region)}" data-label-city="${esc(cityGroup?.name||'')}" data-selected-local="${esc(state.local||'')}" viewBox="${box}" aria-label="${esc(state.region+' '+(cityGroup?.name||''))} 행정구역별 정당 구성"><defs>${defs}</defs>${paths}</svg></div><p>${cityGroup?'구 이름을 눌러 해당 지역 인물을 보세요.':'시·군 이름을 누르세요. 구가 있는 도시는 확대됩니다.'}<span>작은 화면에서는 지도를 밀어서 이동할 수 있습니다.</span></p></div>`;
 const unit=state.type==='assembly'?'석':'명';
 return `<section class="pmap-broadcast"><header class="pmap-region-heading"><div><span>JCS REGIONAL REPORT</span><h2>${esc(region?.fullName||state.region)}</h2><p>${labels[state.type]} · ${esc(selectedName)}</p></div><button type="button" data-map-reset>← 전국 지도</button></header>
 <div class="pmap-scoreboard">${summary.parties.map(p=>`<button type="button" data-map-party="${esc(p.party)}" aria-pressed="${state.party===p.party}" style="--party:${color(p.party)}"><span>${esc(p.party)}</span><strong>${p.count}<small>${unit}</small></strong><em>${(p.share*100).toFixed(1)}%</em></button>`).join('')||'<p>등록된 인물이 없습니다.</p>'}</div>
 <div class="pmap-region-body">${mapMarkup}<aside>${navigator}<div class="pmap-region-total"><span>${esc(selectedName)} 등록 현황</span><strong>${summary.total}<small>${unit}</small></strong><p>현원 ${summary.occupied} · 공석 ${summary.vacant}</p></div><label class="pmap-local-select">세부 지역<select data-map-local-select><option value="">지역 전체</option>${focusedDistricts.map(d=>`<option value="${esc(d.name)}" ${d.name===state.local?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label>${state.party!=='all'?'<button type="button" class="pmap-local-clear" data-map-party="all">정당 선택 해제</button>':''}<p class="pmap-region-help">지도에서 지역을 선택하면<br>해당 지역 인물을 볼 수 있습니다.</p></aside></div>
 <section class="pmap-region-roster"><header><h3>${esc(district?.name||cityGroup?.name||'지역')} 인물 <span>${people.length}</span></h3><form data-map-search><input name="q" value="${esc(state.q)}" aria-label="이름 또는 지역 검색" placeholder="이름 또는 지역 검색"><button type="submit">검색</button></form></header><div class="pmap-region-people">${people.slice(0,state.limit).map(p=>p.isVacant?`<div class="pmap-person-vacant">공석 · ${esc(p.jurisdiction)}</div>`:`<a href="/person/${encodeURIComponent(p.id)}" data-layout-route="/person/${esc(p.id)}" style="--party:${color(normalizeParty(p.party))}"><span class="pmap-region-avatar" data-region-photo="${esc(p.id)}">${esc(p.name?.slice(0,1))}</span><div><strong>${esc(p.name)}</strong><b>${esc(normalizeParty(p.party))}</b><span>${esc(p.jurisdiction||p.region)}</span><small>${labels[p.type]}</small></div></a>`).join('')||'<p>조건에 맞는 인물이 없습니다.</p>'}</div>${people.length>state.limit?'<button type="button" class="pmap-region-more" data-map-more>인물 더 보기</button>':''}</section></section>`;
}
const photos=new Map();
const labelObservers=new WeakMap();
function mountDistrictLabels(root){
 labelObservers.get(root)?.disconnect();
 const svg=root.querySelector('[data-region-labels]');if(!svg)return;
 const viewport=svg.closest('.pmap-region-viewport'),map=svg.closest('.pmap-readable-map');
 const groups=districtLabelGroups(MAP_DISTRICTS.filter(d=>d.region===svg.dataset.regionLabels),svg.dataset.labelCity||'');
 const initialBox=svg.getAttribute('viewBox').split(' ').map(Number),minimumZoom=minimumRegionLabelZoom(groups,initialBox);
 let zoom=minimumZoom,lastRows=[];
 map.style.setProperty('--region-zoom',zoom);
 const draw=()=>{
  const {width,height}=svg.getBoundingClientRect();if(!width||!height)return;
  const box=svg.getAttribute('viewBox').split(' ').map(Number),[vx,vy,vw,vh]=box,scale=Math.min(width/vw,height/vh),ox=(width-vw*scale)/2,oy=(height-vh*scale)/2;
  let group=svg.querySelector('.pmap-direct-names');if(!group){group=document.createElementNS('http://www.w3.org/2000/svg','g');group.setAttribute('class','pmap-direct-names');svg.append(group);}
  lastRows=layoutRegionLabels(groups,box,width,height);
  group.innerHTML=lastRows.map(r=>{
   const x=(r.x-ox)/scale+vx,y=(r.y-oy)/scale+vy,action=r.city?'data-map-city':'data-map-local';
   return '<g '+action+'="'+esc(r.name)+'" tabindex="0" role="button" aria-label="'+esc(r.name+(r.city?' 확대':' 선택'))+'" aria-pressed="'+(svg.dataset.selectedLocal===r.name)+'"><text x="'+x+'" y="'+y+'" text-anchor="middle" dominant-baseline="central" style="font-size:'+REGION_LABEL_FONT/scale+'px;stroke-width:'+3.5/scale+'px">'+esc(r.label)+'</text></g>';
  }).join('');
 };
 for(const button of map.querySelectorAll('[data-map-detail-zoom]'))button.addEventListener('click',()=>{
  const before=zoom,cx=(viewport.scrollLeft+viewport.clientWidth/2)/svg.clientWidth,cy=(viewport.scrollTop+viewport.clientHeight/2)/svg.clientHeight;
  zoom=button.dataset.mapDetailZoom==='reset'?minimumZoom:Math.max(minimumZoom,Math.min(minimumZoom+1.5,zoom+(button.dataset.mapDetailZoom==='in'?.5:-.5)));
  if(zoom===before)return;
  map.style.setProperty('--region-zoom',zoom);
  viewport.scrollLeft=cx*svg.clientWidth-viewport.clientWidth/2;viewport.scrollTop=cy*svg.clientHeight-viewport.clientHeight/2;
  draw();
 });
 draw();viewport.scrollLeft=Math.max(0,(svg.clientWidth-viewport.clientWidth)/2);
 if(minimumZoom>1&&lastRows.length){viewport.scrollLeft=lastRows.reduce((n,r)=>n+r.x,0)/lastRows.length-viewport.clientWidth/2;viewport.scrollTop=lastRows.reduce((n,r)=>n+r.y,0)/lastRows.length-viewport.clientHeight/2;}
 if(globalThis.ResizeObserver){const observer=new ResizeObserver(()=>{if(!svg.isConnected){observer.disconnect();return;}draw();});observer.observe(svg);labelObservers.set(root,observer);}
}
export async function loadRegionPhotos(root){
 mountDistrictLabels(root);
 const nodes=[...root.querySelectorAll('[data-region-photo]')];if(!nodes.length)return;
 const ids=[...new Set(nodes.map(n=>n.dataset.regionPhoto))].filter(id=>!photos.has(id));
 if(ids.length)try{for(let i=0;i<ids.length;i+=100){const response=await fetch('/api/v3/politicians?ids='+encodeURIComponent(ids.slice(i,i+100).join(',')),{credentials:'same-origin'});const data=await response.json();if(!response.ok||!data.ok)return;for(const p of data.items||[])photos.set(p.id,p.photo?.url||p.photo?.localPath||'');}}catch{return;}
 for(const node of nodes){const url=photos.get(node.dataset.regionPhoto);if(!url||!node.isConnected||!(/^(https:\/\/|\/(?!\/))/.test(url)))continue;const image=document.createElement('img');image.src=url;image.alt='';image.loading='lazy';image.addEventListener('error',()=>image.remove(),{once:true});node.append(image);}
}
