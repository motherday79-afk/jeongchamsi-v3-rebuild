import {HOME_BANNER_INTERVAL,HERO_BANNER_INTERVAL} from '../core/home-banner-playlist.js?v=0.0.31.356';

// One controller per root, including DOM restored from navigation snapshots.
const controllers=new WeakMap();
export function setupHomeBannerRotation(root=globalThis.document,options={}){
 controllers.get(root)?.();
 const schedule=options.setInterval||globalThis.setInterval,cancel=options.clearInterval||globalThis.clearInterval;
 const carousels=[...root.querySelectorAll('[data-home-banner-rotation]')];
 const timers=carousels.map(carousel=>{
  const slides=[...carousel.querySelectorAll('[data-home-banner-slide]')];
  if(slides.length<2)return null;
  let index=Math.max(0,slides.findIndex(slide=>!slide.hidden));
  const show=next=>{slides.forEach((slide,i)=>{slide.hidden=i!==next;slide.setAttribute('aria-hidden',String(i!==next));});index=next;};
  show(index);
  const timer=schedule(()=>{
   if(!carousel.isConnected){cancel(timer);return;}
   if(root.hidden||carousel.contains(root.activeElement))return;
   show((index+1)%slides.length);
  },Number(carousel.dataset?.interval)===HERO_BANNER_INTERVAL?HERO_BANNER_INTERVAL:HOME_BANNER_INTERVAL);
  return timer;
 }).filter(timer=>timer!==null);
 const stop=()=>timers.forEach(cancel);controllers.set(root,stop);return stop;
}
