import {TILES,labelDefaults} from '../core/polimable-tile-design.js';
import {tileOutline,sideTransform} from '../core/polimable-tile-outline.js?v=0.0.31.261';
const ns='http://www.w3.org/2000/svg';
const node=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const texture=()=>node('image',{href:'/assets/polimable/editor/tile-clean-255.png',width:1672,height:941,preserveAspectRatio:'none'});
export function mountTileFaces(canvas){
 const svg=node('svg',{viewBox:'0 0 1672 941','aria-hidden':'true'});svg.classList.add('pmle-tile-faces');const defs=node('defs');svg.append(defs);const groups=new Map();
 const clip=(id,d)=>{const c=node('clipPath',{id});c.append(node('path',{d}));defs.append(c);return `url(#${id})`;};
 for(const t of [...TILES].sort((a,b)=>tileOutline(a.index).points[2][1]-tileOutline(b.index).points[2][1])){
  const i=t.index,geo=tileOutline(i),topClip=clip(`pm-top-${i}`,geo.top),wholeClip=clip(`pm-whole-${i}`,geo.footprint),[top,right,bottom,left]=geo.points;
  const gradient=node('linearGradient',{id:`pmcolor-${i}`,x1:0,y1:0,x2:0,y2:1}),stops=[0,.5,.5,1].map(offset=>{const s=node('stop',{offset});gradient.append(s);return s;});defs.append(gradient);
  const color=()=>{const g=node('g',{'clip-path':topClip}),rect=node('path',{d:geo.top,fill:`url(#${gradient.id})`}),shade=rect.cloneNode();rect.style.mixBlendMode='color';shade.setAttribute('opacity','.42');g.append(rect,shade);return g;};
  const idleColor=color();svg.append(idleColor);
  const active=node('g',{'data-pm-tile-surface':i,'data-press-depth':0});active.style.display='none';
  active.append(node('image',{href:'/assets/polimable/editor/tile-platform-260.png',width:1672,height:941,preserveAspectRatio:'none','clip-path':wholeClip}));
  const sideParts=[[left,bottom],[bottom,right]].map(([a,b],part)=>{const d=`M${a}L${b}L${b[0]},${b[1]+geo.thickness}L${a[0]},${a[1]+geo.thickness}Z`,g=node('g',{'clip-path':clip(`pm-side-${i}-${part}`,d)});g.append(texture());const outer=node('g');outer.append(g);active.append(outer);return {a,b,outer};});
  const cap=node('g'),topArt=node('g',{'clip-path':topClip});topArt.append(texture());const tint=color();cap.append(topArt,tint);active.append(cap);svg.append(active);groups.set(i,{geo,active,cap,sideParts,idleColor,tint,stops});
 }
 canvas.append(svg);
 return {contact(i,depth){const g=groups.get(i);if(!g)return;g.active.dataset.pressDepth=String(depth);g.active.style.display=depth>0?'':'none';g.idleColor.style.visibility=depth>0?'hidden':'';g.cap.setAttribute('transform',`translate(0 ${depth})`);for(const {a,b,outer}of g.sideParts)outer.setAttribute('transform',`matrix(${sideTransform(a,b,g.geo.thickness,depth).join(' ')})`);},paint(layout){for(const[i,g]of groups){const v=layout.items[`tile.${i}.label`],changed=v.split||v.background.toUpperCase()!==labelDefaults(i).background.toUpperCase();g.idleColor.style.display=g.tint.style.display=changed?'':'none';g.stops.forEach((s,n)=>s.setAttribute('stop-color',v.split&&n>1?v.background2:v.background));}}};
}
