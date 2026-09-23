import {contactFrame} from '../core/polimable-contact.js?v=0.0.31.260';
const ns='http://www.w3.org/2000/svg';
const node=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
export function mountContactEffects(root){
 const canvas=root.querySelector('[data-pm-logical-canvas]'),layer=node('svg',{viewBox:'0 0 1672 941','aria-hidden':'true'});layer.classList.add('pm-contact-fx');canvas.append(layer);const jobs=new Map();
 const defs=node('defs');defs.innerHTML='<radialGradient id="pm260Glow"><stop stop-color="#fffef0" stop-opacity=".95"/><stop offset=".25" stop-color="#ffe98a" stop-opacity=".8"/><stop offset="1" stop-color="#ffda70" stop-opacity="0"/></radialGradient><linearGradient id="pm260Beam" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#fffdec" stop-opacity=".95"/><stop offset=".25" stop-color="#ffe9a0" stop-opacity=".85"/><stop offset=".65" stop-color="#e4b3ff" stop-opacity=".45"/><stop offset="1" stop-color="#dab0ff" stop-opacity="0"/></linearGradient><filter id="pm260Soft" x="-50%" y="-30%" width="200%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>';layer.append(defs);
 function press(index,player,last,reduced){
  if(reduced)return;jobs.get(index)?.cancel();
  const token=root.querySelector(`[data-pm-character-token="${player}"]`),x=Number.parseFloat(token?.style.getPropertyValue('--pm-token-x')),y=Number.parseFloat(token?.style.getPropertyValue('--pm-token-y'))+2;if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const attached=[root.querySelector(`[data-pmle-key="tile.${index}.label"]`),root.querySelector(`[data-pm-property-object="${index}"]`),...root.querySelectorAll(`[data-pm-character-token][data-pm-tile="${index}"]`)].filter(Boolean),previous=attached.map(e=>e.style.translate);
  const fx=node('g',{'data-pm-contact':index}),glow=node('ellipse',{fill:'url(#pm260Glow)'}),beam=node('path',{d:'M-34 0Q-20 -32 -25 -90L25 -90Q20 -32 34 0Q0 12 -34 0Z',fill:'url(#pm260Beam)',filter:'url(#pm260Soft)'});fx.append(glow,beam);const stars=Array.from({length:last?14:5},(_,i)=>{const e=node('path',{d:'M0 -9L2 -2L9 0L2 2L0 9L-2 2L-9 0L-2 -2Z',fill:i%2?'#ffe29a':'#fff8cf'});fx.append(e);return e;});layer.append(fx);
  let raf=0,ended=false;const start=performance.now(),duration=last?520:240;
  const cancel=()=>{if(ended)return;ended=true;cancelAnimationFrame(raf);attached.forEach((e,i)=>e.style.translate=previous[i]);root._pmTileFaces?.contact(index,0);fx.remove();jobs.delete(index);};jobs.set(index,{cancel});
  function tick(now){if(!root.isConnected){cancel();return;}const t=Math.min(1,(now-start)/duration),f=contactFrame(t,last);root._pmTileFaces?.contact(index,f.depth);attached.forEach(e=>e.style.translate=`0 ${f.depth}px`);fx.setAttribute('transform',`translate(${x} ${y+f.depth})`);glow.setAttribute('rx',String(f.radius));glow.setAttribute('ry',String(f.radius*.3));glow.setAttribute('opacity',String(f.glow));beam.setAttribute('opacity',String(f.beam));stars.forEach((e,i)=>{const p=f.particles[i];e.setAttribute('opacity',String(p?.opacity||0));if(p)e.setAttribute('transform',`translate(${p.x} ${p.y}) scale(${p.scale}) rotate(${p.angle})`);});if(t<1)raf=requestAnimationFrame(tick);else cancel();}raf=requestAnimationFrame(tick);
 }
 return {press,stop(){for(const job of [...jobs.values()])job.cancel();}};
}
