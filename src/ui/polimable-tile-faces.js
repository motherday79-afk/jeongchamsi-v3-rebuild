import {TILES,labelDefaults} from '../core/polimable-tile-design.js';
import {tileOutline,sideTransform,roundPolygon} from '../core/polimable-tile-outline.js?v=0.0.31.261';
const ns='http://www.w3.org/2000/svg';
const node=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const isStrategy=i=>[4,12,20,28].includes(i);
// Cover the source artwork's full side depth, with a narrow overlap at its edges.
function surfaceGeometry(i){const geo=tileOutline(i);if(!isStrategy(i))return geo;
 const cx=geo.points.reduce((n,p)=>n+p[0],0)/4,cy=geo.points.reduce((n,p)=>n+p[1],0)/4;
 const points=geo.points.map(([x,y])=>[cx+(x-cx)*1.022,cy+(y-cy)*1.035]);
 const thickness={4:16,12:13,20:14,28:15}[i], [top,right,bottom,left]=points;
 return {points,thickness,top:roundPolygon(points,4),footprint:roundPolygon([top,right,[right[0],right[1]+thickness],[bottom[0],bottom[1]+thickness],[left[0],left[1]+thickness],left],4)};
}
const texture=()=>node('image',{href:'/assets/polimable/editor/tile-clean-255.png',width:1672,height:941,preserveAspectRatio:'none'});
export function mountTileFaces(canvas){
 const svg=node('svg',{viewBox:'0 0 1672 941','aria-hidden':'true'});svg.classList.add('pmle-tile-faces');const defs=node('defs');svg.append(defs);const groups=new Map();
 const clip=(id,d)=>{const c=node('clipPath',{id});c.append(node('path',{d}));defs.append(c);return `url(#${id})`;};
 for(const t of [...TILES].sort((a,b)=>tileOutline(a.index).points[2][1]-tileOutline(b.index).points[2][1])){
  const i=t.index,silver=isStrategy(i),geo=surfaceGeometry(i),topClip=clip(`pm-top-${i}`,geo.top),wholeClip=clip(`pm-whole-${i}`,geo.footprint),[top,right,bottom,left]=geo.points;
  const gradient=node('linearGradient',{id:`pmcolor-${i}`,x1:0,y1:0,x2:0,y2:1}),stops=[0,.5,.5,1].map(offset=>{const s=node('stop',{offset});gradient.append(s);return s;});defs.append(gradient);
  const color=()=>{const g=node('g',{'clip-path':topClip}),rect=node('path',{d:geo.top,fill:`url(#${gradient.id})`}),shade=rect.cloneNode();rect.style.mixBlendMode='color';shade.setAttribute('opacity','.42');g.append(rect,shade);return g;};
  const idleColor=color();svg.append(idleColor);
  const active=node('g',{'data-pm-tile-surface':i,'data-press-depth':0});active.style.display=silver?'':'none';
  if(silver)for(const part of [0,1]){const metal=node('linearGradient',{id:`pm-silver-${i}-${part}`,x1:0,y1:0,x2:0,y2:1});for(const [offset,c]of [[0,'#f5f8fc'],[.18,'#c4ccd8'],[.5,part?'#738093':'#9ba7b8'],[.78,'#e4eaf2'],[1,'#687489']])metal.append(node('stop',{offset,'stop-color':c}));defs.append(metal);}
  active.append(node('image',{href:'/assets/polimable/editor/tile-platform-260.png',width:1672,height:941,preserveAspectRatio:'none','clip-path':wholeClip}));
  const sideParts=[[left,bottom],[bottom,right]].map(([a,b],part)=>{const d=`M${a}L${b}L${b[0]},${b[1]+geo.thickness}L${a[0]},${a[1]+geo.thickness}Z`,g=node('g',{'clip-path':clip(`pm-side-${i}-${part}`,d)});g.append(silver?node('path',{d,fill:`url(#pm-silver-${i}-${part})`,stroke:'#e3e9f1','stroke-width':.65}):texture());const outer=node('g');outer.append(g);active.append(outer);return {a,b,outer};});
  const cap=node('g'),topArt=node('g',{'clip-path':topClip});if(silver){
   // The complete silver cap is projected onto the existing tile, including its lettering.
   const [a,b,c,d]=['blue','orange'].includes(t.side)?[left,top,right,bottom]:[top,right,bottom,left];
   const ux=((b[0]-a[0])+(c[0]-d[0]))/2,uy=((b[1]-a[1])+(c[1]-d[1]))/2,vx=((d[0]-a[0])+(c[0]-b[0]))/2,vy=((d[1]-a[1])+(c[1]-b[1]))/2;
   const cx=(a[0]+b[0]+c[0]+d[0])/4,cy=(a[1]+b[1]+c[1]+d[1])/4;
   topArt.append(node('path',{d:geo.top,fill:'#cdd5df'}),node('image',{href:'/assets/polimable/editor/strategy-silver-266.png',width:1,height:1,preserveAspectRatio:'none',transform:`matrix(${ux} ${uy} ${vx} ${vy} ${cx-(ux+vx)/2} ${cy-(uy+vy)/2})`}),node('path',{d:geo.top,fill:'none',stroke:'#f4f7ff','stroke-width':1.1}));
  }else topArt.append(texture());const tint=color();cap.append(topArt,tint);active.append(cap);svg.append(active);groups.set(i,{silver,geo,active,cap,sideParts,idleColor,tint,stops});
 }
 canvas.append(svg);
 return {contact(i,depth){const g=groups.get(i);if(!g)return;g.active.dataset.pressDepth=String(depth);g.active.style.display=depth>0||g.silver?'':'none';g.idleColor.style.visibility=depth>0?'hidden':'';g.cap.setAttribute('transform',`translate(0 ${depth})`);for(const {a,b,outer}of g.sideParts)outer.setAttribute('transform',`matrix(${sideTransform(a,b,g.geo.thickness,depth).join(' ')})`);},paint(layout){for(const[i,g]of groups){if(g.silver){g.idleColor.style.display=g.tint.style.display='none';continue;}const v=layout.items[`tile.${i}.label`],changed=v.split||v.background.toUpperCase()!==labelDefaults(i).background.toUpperCase();g.idleColor.style.display=g.tint.style.display=changed?'':'none';g.stops.forEach((s,n)=>s.setAttribute('stop-color',v.split&&n>1?v.background2:v.background));}}};
}
