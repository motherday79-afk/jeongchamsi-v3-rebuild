import {TILES,labelDefaults} from '../core/polimable-tile-design.js';
import {tileOutline,sideTransform,roundPolygon} from '../core/polimable-tile-outline.js?v=0.0.31.261';
import {boardTile,projectPlane,triangleMatrix} from '../core/polimable-board-geometry.js?v=0.0.31.271';
const palette={green:'#3ba882',blue:'#368dc7',purple:'#a262b9',orange:'#d9a145'};
const theme=(t,c)=>c.toUpperCase()===labelDefaults(t.index).background.toUpperCase()?(palette[t.side]||c):c;
const ns='http://www.w3.org/2000/svg';
const node=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const path=p=>'M'+p.map(v=>v.join(',')).join('L')+'Z';
const mix=(hex,n)=>{const a=hex.replace('#','').match(/../g).map(v=>parseInt(v,16));return '#'+a.map(v=>Math.round(n>0?v+(255-v)*n:v*(1+n)).toString(16).padStart(2,'0')).join('');};
export function mountTileFaces(canvas){
 const svg=node('svg',{viewBox:'0 0 1672 941','aria-hidden':'true'});svg.classList.add('pmle-tile-faces');const defs=node('defs');svg.append(defs);const groups=new Map();
 const clip=(id,d)=>{const c=node('clipPath',{id});c.append(node('path',{d}));defs.append(c);return `url(#${id})`;};
 const gradient=(id,colors)=>{const g=node('linearGradient',{id,x1:0,y1:0,x2:0,y2:1});const stops=colors.map(([offset,color])=>{const s=node('stop',{offset,'stop-color':color});g.append(s);return s;});defs.append(g);return stops;};
 gradient('pm271-base',[[0,'#d9b773'],[.12,'#f8e5ab'],[.24,'#71528c'],[.8,'#281736'],[1,'#b88b4f']]);
 const outer=[[-5,-5],[777,-5],[777,777],[-5,777]].map(p=>projectPlane(...p));
 const shadow=node('filter',{id:'pm271-shadow',x:'-20%',y:'-40%',width:'140%',height:'180%'});shadow.append(node('feGaussianBlur',{stdDeviation:14}));defs.append(shadow);
 svg.append(node('path',{d:path(outer.map(([x,y])=>[x,y+33])),fill:'#080211',opacity:.72,filter:'url(#pm271-shadow)'}));
 for(const[a,b]of [[outer[3],outer[2]],[outer[2],outer[1]]]){
  svg.append(node('path',{d:path([a,b,[b[0],b[1]+31],[a[0],a[1]+31]]),fill:'url(#pm271-base)',stroke:'#cda762','stroke-width':1}));
  svg.append(node('path',{d:`M${a[0]},${a[1]+25}L${b[0]},${b[1]+25}`,fill:'none',stroke:'#eac684','stroke-width':1.5,opacity:.8}));
 }
 const baseClip=clip('pm271-backboard',roundPolygon(outer,12)),base=node('g',{'clip-path':baseClip});
 base.append(node('image',{href:'/assets/polimable/design271/backboard.png',width:1,height:1,preserveAspectRatio:'none',transform:`matrix(782 402.73 -782 402.73 836 ${453-782*.515})`}));svg.append(base);
 svg.append(node('path',{d:roundPolygon(outer,12),fill:'none',stroke:'#e1bc72','stroke-width':2}));
 const inner=[[123,123],[649,123],[649,649],[123,649]].map(p=>projectPlane(...p));svg.append(node('path',{d:roundPolygon(inner,8),fill:'none',stroke:'#b49a68','stroke-width':1.5,opacity:.7}));
 for(const t of [...TILES].sort((a,b)=>boardTile(a.index).center[1]-boardTile(b.index).center[1])){
  const i=t.index,geo=boardTile(i),silver=t.type==='card',base=silver?'#cbd4e1':t.corner?'#694492':theme(t,labelDefaults(i).background);
  const topClip=clip(`pm-top-${i}`,geo.top),[top,right,bottom,left]=geo.points;
  const stops=gradient(`pmcolor-${i}`,[[0,mix(base,.3)],[.48,base],[.5,base],[1,mix(base,-.12)]]);
  const sideStops=[0,1].map(part=>gradient(`pm-side-metal-${i}-${part}`,[[0,mix(base,.1)],[.14,base],[.7,mix(base,part?-.30:-.16)],[1,mix(base,-.45)]]));
  const active=node('g',{'data-pm-tile-surface':i,'data-press-depth':0});
  // Fixed recessed well is visible only where the independent block sinks.
  active.append(node('path',{d:geo.footprint,fill:'#302a39',opacity:.8}));
  const sideParts=[[left,bottom],[bottom,right]].map(([a,b],part)=>{const outer=node('g');outer.append(node('path',{d:path([a,b,[b[0],b[1]+geo.thickness],[a[0],a[1]+geo.thickness]]),fill:`url(#pm-side-metal-${i}-${part})`,stroke:mix(base,-.35),'stroke-width':.9,'stroke-linejoin':'round'}));active.append(outer);return {a,b,outer};});
  const cap=node('g'),topArt=node('g',{'clip-path':topClip});topArt.append(node('path',{d:geo.top,fill:`url(#pmcolor-${i})`}));
  {
   const order=['blue','orange'].includes(t.side)?[3,0,1,2]:[0,1,2,3];
   const dst=order.map(n=>geo.points[n]),src=[[0,0],[1,0],[1,1],[0,1]];
   for(const tri of [[0,1,2],[0,2,3]]){const d=tri.map(n=>dst[n]),g=node('g',{'clip-path':clip(`pm-art-${i}-${tri[1]}`,path(d))});g.append(node('image',{href:silver?'/assets/polimable/editor/strategy-silver-266.png':t.corner?`/assets/polimable/design271/corner-${i}.png`:'/assets/polimable/design271/tile.png',width:1,height:1,preserveAspectRatio:'none',transform:`matrix(${triangleMatrix(tri.map(n=>src[n]),d).join(' ')})`}));topArt.append(g);}
  }
  let finish=null;
  if(!silver&&!t.corner){const tint=node('path',{d:geo.top,fill:`url(#pmcolor-${i})`,opacity:.86});tint.style.mixBlendMode='color';finish=node('path',{d:geo.top,fill:`url(#pmcolor-${i})`,opacity:.60});topArt.append(tint,finish);}
  // White bevel catches light while the entire coloured block remains independent.
  topArt.append(node('path',{d:geo.top,fill:'none',stroke:silver?'#f8fbff':'#f0dab0','stroke-width':1.7,'stroke-opacity':.9}));
  cap.append(topArt);active.append(cap);svg.append(active);groups.set(i,{geo,active,cap,sideParts,stops,sideStops,silver,finish,corner:t.corner});
 }
 canvas.append(svg);
 return {contact(i,depth){const g=groups.get(i);if(!g)return;const d=Math.max(0,Math.min(g.geo.thickness-.5,depth));g.active.dataset.pressDepth=String(d);g.cap.setAttribute('transform',`translate(0 ${d})`);for(const{a,b,outer}of g.sideParts)outer.setAttribute('transform',`matrix(${sideTransform(a,b,g.geo.thickness,d).join(' ')})`);},paint(layout){for(const[i,g]of groups){if(g.silver||g.corner)continue;const v=layout.items[`tile.${i}.label`],base=theme(TILES[i],v.background),second=v.split?v.background2:base;
  if(g.finish)g.finish.setAttribute('opacity',v.split?.90:.60);
  const colors=[mix(base,.25),base,second,mix(second,-.1)];g.stops.forEach((s,n)=>{s.setAttribute('stop-color',colors[n]);s.setAttribute('offset',[0,.5,.5,1][n]);});
  g.sideStops.forEach((stops,part)=>[mix(base,.1),base,mix(base,part?-.30:-.16),mix(base,-.45)].forEach((c,n)=>stops[n].setAttribute('stop-color',c)));
 }}};
}
