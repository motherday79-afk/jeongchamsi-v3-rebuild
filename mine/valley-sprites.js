// Chroma-key at sprite upload time; preserve dark clothing instead of fading a box.
export function removeSpriteMatte(data){
 for(let i=0;i<data.length;i+=4){
  const magenta=Math.min(data[i]-data[i+1],data[i+2]-data[i+1]);
  const key=Math.max(0,Math.min(1,(magenta-20)/65));
  if(!key)continue;
  data[i+3]=Math.round(data[i+3]*(1-key));
  if(key<1){data[i]=Math.round(data[i]*(1-key)+data[i+1]*key);data[i+2]=Math.round(data[i+2]*(1-key)+data[i+1]*key);}
 }
 return data;
}
export function prepareValleySprites(image){
 return Array.from({length:16},(_,i)=>{
  const sw=image.width/4,sh=image.height/4;
  const tile=document.createElement('canvas');tile.width=Math.ceil(sw);tile.height=Math.ceil(sh);
  const c=tile.getContext('2d',{willReadFrequently:true});
  c.drawImage(image,(i%4)*sw,Math.floor(i/4)*sh,sw,sh,0,0,tile.width,tile.height);
  const pixels=c.getImageData(0,0,tile.width,tile.height);removeSpriteMatte(pixels.data);c.putImageData(pixels,0,0);
  return tile;
 });
}
export function valleyPose(health,time,moving,direction,walking){
 const column=moving?(direction<0?2:3):walking?Math.floor(time/190)%2:0;
 return Math.max(0,Math.min(3,3-health))*4+column;
}
