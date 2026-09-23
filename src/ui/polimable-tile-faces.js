import {TILES,faceGeometry,labelDefaults} from '../core/polimable-tile-design.js';
import {tileSides} from '../core/polimable-contact.js?v=0.0.31.260';
const ns='http://www.w3.org/2000/svg';
const node=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const tone=(hex,m)=>'#'+hex.slice(1).match(/../g).map(n=>Math.round(parseInt(n,16)*m).toString(16).padStart(2,'0')).join('');
export function mountTileFaces(canvas){
 const svg=node('svg',{viewBox:'0 0 1672 941','aria-hidden':'true'});svg.classList.add('pmle-tile-faces');
 const defs=node('defs'),groundClip=node('clipPath',{id:'pm260Ground'});defs.append(groundClip);svg.append(defs);
 svg.append(node('image',{href:'/assets/polimable/editor/tile-platform-260.png',width:1672,height:941,preserveAspectRatio:'none','clip-path':'url(#pm260Ground)'}));
 const groups=new Map();
 for(const t of [...TILES].sort((a,b)=>faceGeometry(a.index).y-faceGeometry(b.index).y)){
  const geo=faceGeometry(t.index),{x,y,w,h}=geo,id=`pmface-${t.index}`,clip=node('clipPath',{id}),points=`${x-w/2},${y} ${x},${y-h/2} ${x+w/2},${y} ${x},${y+h/2}`;
  clip.append(node('polygon',{points}));groundClip.append(node('polygon',{points:`${x-w/2-2},${y-1} ${x},${y-h/2-2} ${x+w/2+2},${y-1} ${x+w/2+2},${y+13} ${x},${y+h/2+14} ${x-w/2-2},${y+13}`}));
  if(t.corner){const v=labelDefaults(t.index),rect={x:v.x-v.w/2-5,y:v.y-23,width:v.w+10,height:46,rx:5};clip.append(node('rect',rect));groundClip.append(node('rect',{...rect,height:58}));}defs.append(clip);
  const sides=tileSides(geo,0),left=node('path',{d:sides.left}),right=node('path',{d:sides.right}),surface=node('g',{'clip-path':`url(#${id})`,'data-pm-tile-surface':t.index});
  surface.append(node('image',{href:'/assets/polimable/editor/tile-clean-255.png',width:1672,height:941,preserveAspectRatio:'none'}));
  const gradient=node('linearGradient',{id:`pmcolor-${t.index}`,x1:0,y1:0,x2:0,y2:1}),stops=[0,.5,.5,1].map(offset=>{const s=node('stop',{offset});gradient.append(s);return s;});defs.append(gradient);
  const color=node('rect',{x:x-w/2,y:y-h/2,width:w,height:h,fill:`url(#${gradient.id})`}),shade=node('rect',{x:x-w/2,y:y-h/2,width:w,height:h,fill:`url(#${gradient.id})`,opacity:'.42'});color.style.mixBlendMode='color';surface.append(color,shade,node('polygon',{points,fill:'none',stroke:'#fff7ca','stroke-width':'.85',opacity:'.45'}));svg.append(left,right,surface);
  groups.set(t.index,{geo,surface,left,right,color,shade,stops});
 }
 canvas.append(svg);
 return {contact(i,depth){const g=groups.get(i);if(!g)return;g.surface.setAttribute('transform',`translate(0 ${depth})`);g.surface.dataset.pressDepth=String(depth);const sides=tileSides(g.geo,depth);g.left.setAttribute('d',sides.left);g.right.setAttribute('d',sides.right);},paint(layout){for(const [i,g]of groups){const v=layout.items[`tile.${i}.label`],changed=v.split||v.background.toUpperCase()!==labelDefaults(i).background.toUpperCase();g.color.style.display=g.shade.style.display=changed?'':'none';g.stops.forEach((s,n)=>s.setAttribute('stop-color',v.split&&n>1?v.background2:v.background));g.left.setAttribute('fill',tone(v.background,.63));g.right.setAttribute('fill',tone(v.background,.48));}}};
}
