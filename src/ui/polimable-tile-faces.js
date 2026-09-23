import {TILES,faceGeometry,labelDefaults} from '../core/polimable-tile-design.js';
export function mountTileFaces(canvas){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1672 941');svg.classList.add('pmle-tile-faces');svg.setAttribute('aria-hidden','true');
 const defs=document.createElementNS(ns,'defs');svg.append(defs);const groups=[];
 for(const t of TILES){const {x,y,w,h}=faceGeometry(t.index),id=`pmface-${t.index}`,clip=document.createElementNS(ns,'clipPath');clip.id=id;const p=document.createElementNS(ns,'polygon');p.setAttribute('points',`${x-w/2},${y} ${x},${y-h/2} ${x+w/2},${y} ${x},${y+h/2}`);clip.append(p);if(t.corner){const v=labelDefaults(t.index),rect=document.createElementNS(ns,'rect');for(const [k,n]of Object.entries({x:v.x-v.w/2-5,y:v.y-23,width:v.w+10,height:46,rx:5}))rect.setAttribute(k,String(n));clip.append(rect);}defs.append(clip);
 const g=document.createElementNS(ns,'g');g.setAttribute('clip-path',`url(#${id})`);const image=document.createElementNS(ns,'image');image.setAttribute('href','/assets/polimable/editor/tile-clean-255.png');image.setAttribute('width','1672');image.setAttribute('height','941');image.setAttribute('preserveAspectRatio','none');g.append(image);
 const gradient=document.createElementNS(ns,'linearGradient');gradient.id=`pmcolor-${t.index}`;gradient.setAttribute('x1','0');gradient.setAttribute('y1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y2','1');const stops=[0,.5,.5,1].map(offset=>{const s=document.createElementNS(ns,'stop');s.setAttribute('offset',String(offset));gradient.append(s);return s;});defs.append(gradient);
 const color=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:x-w/2,y:y-h/2,width:w,height:h,fill:`url(#${gradient.id})`}))color.setAttribute(k,String(v));color.style.mixBlendMode='color';g.append(color);
 const shade=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:x-w/2,y:y-h/2,width:w,height:h,fill:`url(#${gradient.id})`,opacity:'.42'}))shade.setAttribute(k,String(v));g.append(shade);// Keep the original face stationary; blend only the interior while it presses.
 svg.append(g);
 const fade=document.createElementNS(ns,'radialGradient');fade.id=`pmpress-fade-${t.index}`;
 for(const [offset,opacity]of [[0,1],[.35,1],[.7,0],[1,0]]){const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',String(offset));stop.setAttribute('stop-color','white');stop.setAttribute('stop-opacity',String(opacity));fade.append(stop);}defs.append(fade);
 const mask=document.createElementNS(ns,'mask');mask.id=`pmpress-mask-${t.index}`;mask.setAttribute('maskUnits','userSpaceOnUse');
 for(const [k,v]of Object.entries({x:x-w/2,y:y-h/2,width:w,height:h}))mask.setAttribute(k,String(v));
 const area=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:x-w/2,y:y-h/2,width:w,height:h,fill:`url(#${fade.id})`}))area.setAttribute(k,String(v));mask.append(area);defs.append(mask);
 const holder=document.createElementNS(ns,'g');holder.setAttribute('mask',`url(#${mask.id})`);holder.style.visibility='hidden';
 const surface=g.cloneNode(true);surface.removeAttribute('clip-path');surface.dataset.pmTileSurface=String(t.index);surface.style.transformBox='view-box';holder.append(surface);svg.append(holder);
 const pressColor=surface.children[1],pressShade=surface.children[2];
 groups.push({i:t.index,color,shade,stops,pressColor,pressShade});}
 canvas.append(svg);return {paint(layout){for(const {i,color,shade,stops,pressColor,pressShade}of groups){const v=layout.items[`tile.${i}.label`];const changed=v.split||v.background.toUpperCase()!==labelDefaults(i).background.toUpperCase();color.style.display=shade.style.display=pressColor.style.display=pressShade.style.display=changed?'':'none';stops.forEach((s,n)=>s.setAttribute('stop-color',v.split&&n>1?v.background2:v.background));}}};
}
