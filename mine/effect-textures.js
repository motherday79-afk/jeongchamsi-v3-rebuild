// Load only equipped effect textures; canvas masks keep atlas-cell edges invisible.
const cache=new Map();
export function effectTexture(id,onReady){
 if(!['mystic','dimension','dark','heaven','lightning','wind'].includes(id))return null;
 const saved=cache.get(id);if(saved){if(!saved.canvas&&!saved.failed)saved.listeners.add(onReady);return saved.canvas;}
 const entry={canvas:null,listeners:new Set([onReady]),failed:false};cache.set(id,entry);
 const image=new Image();image.onload=()=>{const surface=document.createElement('canvas');surface.width=surface.height=512;const c=surface.getContext('2d');c.drawImage(image,0,0,512,512);
  c.globalCompositeOperation='destination-in';let fade=c.createLinearGradient(0,0,512,0);fade.addColorStop(0,'#0000');fade.addColorStop(.07,'#000');fade.addColorStop(.93,'#000');fade.addColorStop(1,'#0000');c.fillStyle=fade;c.fillRect(0,0,512,512);
  fade=c.createLinearGradient(0,0,0,512);fade.addColorStop(0,'#0000');fade.addColorStop(.06,'#000');fade.addColorStop(.94,'#000');fade.addColorStop(1,'#0000');c.fillStyle=fade;c.fillRect(0,0,512,512);
  entry.canvas=surface;for(const cb of entry.listeners)cb?.();entry.listeners.clear();};
 image.onerror=()=>{entry.failed=true;entry.listeners.clear();};image.src='/assets/mine/effects-290/'+id+'.webp';return null;
}
export function drawTexturePart(ctx,image,id,x,y,size,angle=0){
 if(!image)return;const crop=id==='heaven'?[43,67,155,132]:id==='wind'?[329,29,151,195]:[320,44,94,153];
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(image,...crop,-size/2,-size/2,size,size*crop[3]/crop[2]);ctx.restore();
}
