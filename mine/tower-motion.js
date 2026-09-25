// Invisible grip at the handle end: slow wind-up, fast arc and extra-hit rebound.
export function towerMotion(elapsed,events,oreHeight,remaining){
 const previous=events.findLast(e=>e.at<=elapsed),next=events.find(e=>e.at>elapsed);
 const drop=oreHeight*.85*(1-Math.cbrt(Math.max(0,Math.min(1,remaining))));
 if(!next)return {drop,angle:20};
 const since=previous?elapsed-previous.at:elapsed,until=next.at-elapsed;
 if(previous&&since<35)return {drop,angle:20};
 const gap=previous?next.at-previous.at:next.at;
 const fall=Math.min(180,gap*.45),lift=gap<300?38:75;
 const rise=until<fall?until/fall:Math.min(1,Math.max(0,since-35)/Math.max(35,gap-fall-35));
 return {drop,angle:20-lift*rise};
}
