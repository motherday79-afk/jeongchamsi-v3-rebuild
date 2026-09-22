// Shared by editor, gameplay renderer and server validation.
export const BOARD='diamond-31-249-1672x941',W=1672,H=941;
export const FIELDS={profile:'프로필 사진',name:'플레이어 이름',mind:'민심 글자',cash:'민심 점수',laps:'바퀴 수',assetLabel:'자산 글자',assets:'자산 점수'};
export const KEYS=['p1','p2'].flatMap(p=>Object.keys(FIELDS).map(f=>`${p}.${f}`));
export const copy=v=>JSON.parse(JSON.stringify(v));
export function defaults(){const items={};for(const [p,dx] of [['p1',0],['p2',1200]]){
 items[`${p}.profile`]={x:p==='p1'?55:1527,y:92,w:88,h:88,zoom:1.08,panX:0,panY:0};
 const t=(f,x,y,w,h,font,color='#FFFFFF')=>items[`${p}.${f}`]={x:x+dx,y,w,h,font,color};
 t('name',190,101,125,13,12);t('mind',190,115,33,22,16);t('cash',224,114,91,23,20,'#FFF2A6');t('laps',190,147,46,24,15);t('assetLabel',236,147,30,24,14);t('assets',266,147,49,24,15);
 }return {schema:1,board:BOARD,items};}
const num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
export function validate(d){if(!d||d.schema!==1||d.board!==BOARD||!d.items||Object.keys(d).sort().join()!=='board,items,schema'||Object.keys(d.items).sort().join()!==[...KEYS].sort().join())throw Error('INVALID_LAYOUT');
 for(const k of KEYS){const v=d.items[k],photo=k.endsWith('.profile'),allowed=photo?['x','y','w','h','zoom','panX','panY']:['x','y','w','h','font','color'];if(!v||Object.keys(v).sort().join()!==allowed.sort().join())throw Error('INVALID_FIELDS');
  if(!num(v.x,0,W)||!num(v.y,0,H)||!num(v.w,12,600)||!num(v.h,10,300)||v.x+v.w>W+.01||v.y+v.h>H+.01)throw Error('INVALID_BOUNDS');
  if(photo){if(v.w!==v.h||!num(v.zoom,1,2.5)||!num(v.panX,-100,100)||!num(v.panY,-100,100))throw Error('INVALID_PROFILE');}
  else if(!num(v.font,10,48)||!/^#[a-fA-F0-9]{6}$/.test(v.color))throw Error('INVALID_TEXT');
 }return copy(d);}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),r=n=>Math.round(n*10)/10;
export function adjust(k,old,delta){const v={...old,...delta},p=k.endsWith('.profile');v.w=r(clamp(v.w,p?32:12,p?260:600));v.h=p?v.w:r(clamp(v.h,10,100));v.x=r(clamp(v.x,0,W-v.w));v.y=r(clamp(v.y,0,H-v.h));if(p){v.zoom=r(clamp(v.zoom,1,2.5));v.panX=r(clamp(v.panX,-100,100));v.panY=r(clamp(v.panY,-100,100));}else v.font=r(clamp(v.font,10,48));return v;}
export function point(x,y,rect){if(!rect.width||!rect.height)throw Error('NO_BOARD');return {x:(x-rect.left)*W/rect.width,y:(y-rect.top)*H/rect.height};}
