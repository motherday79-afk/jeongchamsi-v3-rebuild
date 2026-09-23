import {TILES,labelDefaults} from '../core/polimable-tile-design.js';
import {tileOutline,sideTransform,roundPolygon} from '../core/polimable-tile-outline.js?v=0.0.31.261';
import {boardTile,projectPlane,triangleMatrix} from '../core/polimable-board-geometry.js?v=0.0.31.273';
const palette={green:'#65b66e',blue:'#61b6db',purple:'#be8ec9',orange:'#e8b95a'};
const theme=(t,c)=>c.toUpperCase()===labelDefaults(t.index).background.toUpperCase()?(palette[t.side]||c):c;
const ns='http://www.w3.org/2000/svg';
const node=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const path=p=>'M'+p.map(v=>v.join(',')).join('L')+'Z';
const mix=(hex,n)=>{const a=hex.replace('#','').match(/../g).map(v=>parseInt(v,16));return '#'+a.map(v=>Math.round(n>0?v+(255-v)*n:v*(1+n)).toString(16).padStart(2,'0')).join('');};
export function mountTileFaces(canvas){
 const svg=node('svg',{viewBox:'0 0 1672 941','aria-hidden':'true'});svg.classList.add('pmle-tile-faces');const defs=node('defs');svg.append(defs);const groups=new Map();
 const clip=(id,d)=>{const c=node('clipPath',{id});c.append(node('path',{d}));defs.append(c);return `url(#${id})`;};
 const gradient=(id,colors)=>{const g=node('linearGradient',{id,x1:0,y1:0,x2:0,y2:1});const stops=colors.map(([offset,color])=>{const s=node('stop',{offset,'stop-color':color});g.append(s);return s;});defs.append(g);return stops;};
 // Foundation and plaza are part of the unified environment; only movable blocks render here.
 for(const t of [...TILES].sort((a,b)=>boardTile(a.index).center[1]-boardTile(b.index).center[1])){
  const i=t.index,geo=boardTile(i),silver=t.type==='card',base=silver?'#cbd4e1':t.corner?'#694492':theme(t,labelDefaults(i).background);
  const topClip=clip(`pm-top-${i}`,geo.top),[top,right,bottom,left]=geo.points;
  const stops=gradient(`pmcolor-${i}`,[[0,mix(base,.3)],[.48,base],[.5,base],[1,mix(base,-.12)]]);
  const sideStops=[0,1].map(part=>gradient(`pm-side-metal-${i}-${part}`,[[0,mix(base,.1)],[.14,base],[.7,mix(base,part?-.30:-.16)],[1,mix(base,-.45)]]));
  const active=node('g',{'data-pm-tile-surface':i,'data-press-depth':0});
  // Fixed recessed well is visible only where the independent block sinks.
  active.append(node('path',{d:geo.footprint,fill:'#415b59',opacity:.8}));
  const sideParts=[[left,bottom],[bottom,right]].map(([a,b],part)=>{const outer=node('g');outer.append(node('path',{d:path([a,b,[b[0],b[1]+geo.thickness],[a[0],a[1]+geo.thickness]]),fill:`url(#pm-side-metal-${i}-${part})`,stroke:mix(base,-.35),'stroke-width':.9,'stroke-linejoin':'round'}));active.append(outer);return {a,b,outer};});
  const cap=node('g'),topArt=node('g',{'clip-path':topClip});topArt.append(node('path',{d:geo.top,fill:`url(#pmcolor-${i})`}));
  {
   const order=['blue','orange'].includes(t.side)?[3,0,1,2]:[0,1,2,3];
   const dst=order.map(n=>geo.points[n]),src=[[0,0],[1,0],[1,1],[0,1]];
   for(const tri of [[0,1,2],[0,2,3]]){const d=tri.map(n=>dst[n]),g=node('g',{'clip-path':clip(`pm-art-${i}-${tri[1]}`,path(d))});g.append(node('image',{href:silver?'/assets/polimable/editor/strategy-silver-266.png':i===0?'/assets/polimable/design271/corner-0.png':'/assets/polimable/design272/tile.png',width:1,height:1,preserveAspectRatio:'none',transform:`matrix(${triangleMatrix(tri.map(n=>src[n]),d).join(' ')})`}));topArt.append(g);}
  }
  let finish=null;
  if(!silver&&i!==0){const tint=node('path',{d:geo.top,fill:`url(#pmcolor-${i})`,opacity:.86});tint.style.mixBlendMode='color';finish=node('path',{d:geo.top,fill:`url(#pmcolor-${i})`,opacity:.60});topArt.append(tint,finish);}
  // White bevel catches light while the entire coloured block remains independent.
  topArt.append(node('path',{d:geo.top,fill:'none',stroke:silver?'#f8fbff':'#e9f1e8','stroke-width':1.7,'stroke-opacity':.9}));
  cap.append(topArt);
  if([8,16,24].includes(i)){
   const [cx,cy]=geo.center,name={8:'hope',16:'fate',24:'bond'}[i],w=i===16?108:154,h=i===16?98:132;
   cap.append(node('ellipse',{cx,cy:cy-4,rx:43,ry:13,fill:'#291f42',opacity:.22}));
   cap.append(node('image',{'data-pm-corner-symbol':i,href:`/assets/polimable/design273/${name}.png`,x:cx-w/2,y:cy+4-h,width:w,height:h,preserveAspectRatio:'xMidYMid meet'}));
  }
  active.append(cap);svg.append(active);groups.set(i,{geo,active,cap,sideParts,stops,sideStops,silver,finish,corner:t.corner});
 }
 canvas.append(svg);
 return {contact(i,depth){const g=groups.get(i);if(!g)return;const d=Math.max(0,Math.min(g.geo.thickness-.5,depth));g.active.dataset.pressDepth=String(d);g.cap.setAttribute('transform',`translate(0 ${d})`);for(const{a,b,outer}of g.sideParts)outer.setAttribute('transform',`matrix(${sideTransform(a,b,g.geo.thickness,d).join(' ')})`);},paint(layout){for(const[i,g]of groups){if(g.silver||g.corner)continue;const v=layout.items[`tile.${i}.label`],base=theme(TILES[i],v.background),second=v.split?v.background2:base;
  if(g.finish)g.finish.setAttribute('opacity',v.split?.90:.60);
  const colors=[mix(base,.25),base,second,mix(second,-.1)];g.stops.forEach((s,n)=>{s.setAttribute('stop-color',colors[n]);s.setAttribute('offset',[0,.5,.5,1][n]);});
  g.sideStops.forEach((stops,part)=>[mix(base,.1),base,mix(base,part?-.30:-.16),mix(base,-.45)].forEach((c,n)=>stops[n].setAttribute('stop-color',c)));
 }}};
}
