import {MAP_REGIONS,MAP_DISTRICTS} from '../data/political-map-geometry.js?v=0.0.31.391';
import {politicalMapSummary,normalizeRegion,normalizeParty} from '../core/political-map-model.js?v=0.0.31.391';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={all:'전체',assembly:'국회의원',metropolitan:'광역단체장',basic:'기초단체장'};
export function districtMembers(items,district){
 return items.filter(p=>{
  if(normalizeRegion(p)!==district.region)return false;
  if(p.type==='metropolitan')return true;
  const local=String(p.jurisdiction||'').replace(/^(서울특별시|부산광역시|대구광역시|인천광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전남광주통합특별시|전라남도|광주광역시|경상북도|경상남도|제주특별자치도)\s*/, '').replace(/\s/g,'');
  return !!local&&(local.startsWith(district.name)||district.name.startsWith(local)||(local.match(/^.+?시/)?.[0]===district.name));
 });
}
export function renderRegionStage(data,state,color,navigator=''){
 const region=MAP_REGIONS.find(r=>r.name===state.region);
 const regional=politicalMapSummary(data.items,{type:state.type,region:state.region});
 const districts=MAP_DISTRICTS.filter(d=>d.region===state.region);
 const district=districts.find(d=>d.name===state.local);
 const localItems=district?districtMembers(regional.items,district):regional.items;
 const summary=politicalMapSummary(localItems);
 const people=localItems.filter(p=>(state.party==='all'||(p.isVacant?'공석':normalizeParty(p.party))===state.party)&&(!state.district||state.district===p.id)&&(!state.q||(p.name+' '+p.jurisdiction).includes(state.q)));
 let defs='',paths='';
 const shapes=districts.length?districts:region?[region]:[];
 for(const [i,d] of shapes.entries()){
  const stats=d.region?politicalMapSummary(districtMembers(regional.items,d)):regional;
  const id='pmap-local-'+i;let offset=0;
  defs+='<linearGradient id="'+id+'">'+stats.parties.map(p=>{const start=offset;offset+=p.share*100;const paint=state.party!=='all'&&state.party!==p.party?'#526075':color(p.party);return '<stop offset="'+start+'%" stop-color="'+paint+'"/><stop offset="'+offset+'%" stop-color="'+paint+'"/>';}).join('')+'</linearGradient>';
  paths+='<path d="'+d.d+'" fill="'+(stats.total?'url(#'+id+')':'#475469')+'" data-map-local="'+esc(d.name)+'" role="button" tabindex="0" aria-label="'+esc(d.name+' · '+stats.total+'명')+'" class="'+(state.local===d.name?'is-selected':'')+'"><title>'+esc(d.name+' · '+stats.parties.map(p=>p.party+' '+p.count+'명').join(', '))+'</title></path>';
 }
 const b=region?.bounds,box=b?[b[0]-4,b[1]-4,b[2]+8,b[3]+8].join(' '):'0 0 600 700';
 const unit=state.type==='assembly'?'석':'명';
 return `<section class="pmap-broadcast"><header class="pmap-region-heading"><div><span>JCS REGIONAL REPORT</span><h2>${esc(region?.fullName||state.region)}</h2><p>${labels[state.type]} · ${district?esc(district.name):'지역 전체'}</p></div><button type="button" data-map-reset>← 전국 지도</button></header>
 <div class="pmap-scoreboard">${summary.parties.map(p=>`<button type="button" data-map-party="${esc(p.party)}" aria-pressed="${state.party===p.party}" style="--party:${color(p.party)}"><span>${esc(p.party)}</span><strong>${p.count}<small>${unit}</small></strong><em>${(p.share*100).toFixed(1)}%</em></button>`).join('')||'<p>등록된 인물이 없습니다.</p>'}</div>
 <div class="pmap-region-body"><div class="pmap-region-map"><svg data-region-labels="${esc(state.region)}" data-selected-local="${esc(state.local||'')}" viewBox="${box}" aria-label="${esc(state.region)} 행정구역별 정당 구성"> <defs>${defs}</defs>${paths}</svg><p>지역 이름을 눌러 선택하세요 · 행정구역 기준</p></div><aside>${navigator}<div class="pmap-region-total"><span>${district?esc(district.name):'지역 전체'} 등록 현황</span><strong>${summary.total}<small>${unit}</small></strong><p>현원 ${summary.occupied} · 공석 ${summary.vacant}</p></div><label class="pmap-local-select">세부 지역<select data-map-local-select><option value="">지역 전체</option>${districts.map(d=>`<option value="${esc(d.name)}" ${d.name===state.local?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label>${state.party!=='all'?'<button type="button" class="pmap-local-clear" data-map-party="all">정당 선택 해제</button>':''}<p class="pmap-region-help">지도에서 지역을 선택하면<br>해당 지역 인물을 볼 수 있습니다.</p></aside></div>
 <section class="pmap-region-roster"><header><h3>${district?esc(district.name):'지역'} 인물 <span>${people.length}</span></h3><form data-map-search><input name="q" value="${esc(state.q)}" aria-label="이름 또는 지역 검색" placeholder="이름 또는 지역 검색"><button type="submit">검색</button></form></header><div class="pmap-region-people">${people.slice(0,state.limit).map(p=>p.isVacant?`<div class="pmap-person-vacant">공석 · ${esc(p.jurisdiction)}</div>`:`<a href="/person/${encodeURIComponent(p.id)}" data-layout-route="/person/${esc(p.id)}" style="--party:${color(normalizeParty(p.party))}"><span class="pmap-region-avatar" data-region-photo="${esc(p.id)}">${esc(p.name?.slice(0,1))}</span><div><strong>${esc(p.name)}</strong><b>${esc(normalizeParty(p.party))}</b><span>${esc(p.jurisdiction||p.region)}</span><small>${labels[p.type]}</small></div></a>`).join('')||'<p>조건에 맞는 인물이 없습니다.</p>'}</div>${people.length>state.limit?'<button type="button" class="pmap-region-more" data-map-more>인물 더 보기</button>':''}</section></section>`;
}
const photos=new Map();
export function placeDistrictLabels(rows,width,height){
 const placed=[],overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+3&&Math.abs(a.y-b.y)<(a.h+b.h)/2+3;
 for(const row of rows){
  const lines=row.name.replace(/시(?=.+구$)/,'시\n').split('\n'),w=Math.max(...lines.map(s=>s.length))*13+14,h=lines.length*16+8;
  const fit=(x,y)=>({x:Math.max(w/2+3,Math.min(width-w/2-3,x)),y:Math.max(h/2+3,Math.min(height-h/2-3,y)),w,h});
  let best=fit(row.x,row.y);
  if(placed.some(p=>overlaps(best,p))){let score=Infinity;for(let y=h/2+3;y<=height-h/2-3;y+=8)for(let x=w/2+3;x<=width-w/2-3;x+=8){const candidate={x,y,w,h},distance=(x-row.x)**2+(y-row.y)**2;if(distance<score&&!placed.some(p=>overlaps(candidate,p))){best=candidate;score=distance;}}}
  placed.push({...row,...best,lines,anchorX:row.x,anchorY:row.y});
 }
 return placed;
}
const labelObservers=new WeakMap();
function mountDistrictLabels(root){
 labelObservers.get(root)?.disconnect();
 const svg=root.querySelector('[data-region-labels]');if(!svg)return;
 const draw=()=>{
  const {width,height}=svg.getBoundingClientRect();if(!width||!height)return;
  const [vx,vy,vw,vh]=svg.getAttribute('viewBox').split(' ').map(Number),scale=Math.min(width/vw,height/vh),ox=(width-vw*scale)/2,oy=(height-vh*scale)/2;
  const rows=MAP_DISTRICTS.filter(d=>d.region===svg.dataset.regionLabels).map(d=>({name:d.name,x:(d.center[0]-vx)*scale+ox,y:(d.center[1]-vy)*scale+oy}));
  let group=svg.querySelector('.pmap-district-names');if(!group){group=document.createElementNS('http://www.w3.org/2000/svg','g');group.setAttribute('class','pmap-district-names');svg.append(group);}
  const point=(x,y)=>[(x-ox)/scale+vx,(y-oy)/scale+vy];
  group.innerHTML=placeDistrictLabels(rows,width,height).map(r=>{const [x,y]=point(r.x,r.y),[ax,ay]=point(r.anchorX,r.anchorY),moved=Math.hypot(r.x-r.anchorX,r.y-r.anchorY)>12;return (moved?`<line x1="${ax}" y1="${ay}" x2="${x}" y2="${y}"/><circle cx="${ax}" cy="${ay}" r="${2.5/scale}"/>`:'')+`<g data-map-local="${esc(r.name)}" tabindex="0" role="button" aria-label="${esc(r.name)} 선택" aria-pressed="${svg.dataset.selectedLocal===r.name}"><rect x="${x-r.w/scale/2}" y="${y-r.h/scale/2}" width="${r.w/scale}" height="${r.h/scale}" rx="${4/scale}"/><text x="${x}" y="${y}" text-anchor="middle" style="font-size:${13/scale}px">${r.lines.map((line,i)=>`<tspan x="${x}" dy="${(i?16:-(r.lines.length-1)*8+4)/scale}">${esc(line)}</tspan>`).join('')}</text></g>`;}).join('');
 };
 draw();if(globalThis.ResizeObserver){const observer=new ResizeObserver(()=>{if(!svg.isConnected){observer.disconnect();return;}draw();});observer.observe(svg);labelObservers.set(root,observer);}
}
export async function loadRegionPhotos(root){
 mountDistrictLabels(root);
 const nodes=[...root.querySelectorAll('[data-region-photo]')];if(!nodes.length)return;
 const ids=[...new Set(nodes.map(n=>n.dataset.regionPhoto))].filter(id=>!photos.has(id));
 if(ids.length)try{for(let i=0;i<ids.length;i+=100){const response=await fetch('/api/v3/politicians?ids='+encodeURIComponent(ids.slice(i,i+100).join(',')),{credentials:'same-origin'});const data=await response.json();if(!response.ok||!data.ok)return;for(const p of data.items||[])photos.set(p.id,p.photo?.url||p.photo?.localPath||'');}}catch{return;}
 for(const node of nodes){const url=photos.get(node.dataset.regionPhoto);if(!url||!node.isConnected||!(/^(https:\/\/|\/(?!\/))/.test(url)))continue;const image=document.createElement('img');image.src=url;image.alt='';image.loading='lazy';image.addEventListener('error',()=>image.remove(),{once:true});node.append(image);}
}
