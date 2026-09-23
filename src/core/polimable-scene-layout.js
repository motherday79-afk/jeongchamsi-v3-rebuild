import {defaults as legacyDefaults,validate as legacyValidate,adjust as legacyAdjust,BOARD,W,H,FIELDS,point,copy} from './polimable-hud-legacy.js';
import {POLIMARBLE_32_TILE_LAYOUT as TILES,POLIMARBLE_TOKEN_POINTS as TOKENS,POLIMARBLE_PROPERTY_OBJECT_POINTS as OBJECTS} from './polimable-layout.js';
export {BOARD,W,H,FIELDS,point,copy,TILES};
export const SLOTS={solo:'캐릭터 · 혼자 도착',p1:'캐릭터 · 함께 도착 1P',p2:'캐릭터 · 함께 도착 2P',flag:'소유 깃발',building1:'건물 · 강화 1단계',building2:'건물 · 강화 2단계',building3:'건물 · 강화 3단계'};
export const HUD_KEYS=Object.keys(legacyDefaults().items).concat('board.logo');
export const KEYS=HUD_KEYS.concat(TILES.flatMap(t=>Object.keys(SLOTS).filter(s=>['solo','p1','p2'].includes(s)||OBJECTS[t.index]).map(s=>`tile.${t.index}.${s}`)));
export const isAnchor=k=>k.startsWith('tile.');
export const isImage=k=>k.endsWith('.profile')||k==='board.logo'||isAnchor(k);
export const fieldTitle=k=>isAnchor(k)?`${TILES[Number(k.split('.')[1])].tileNo}번 ${TILES[Number(k.split('.')[1])].label} · ${SLOTS[k.split('.')[2]]}`:k==='board.logo'?'상단 중앙 로고':`${k.startsWith('p1.')?'1P':'2P'} · ${FIELDS[k.split('.')[1]]}`;
export function defaults(){const d=legacyDefaults();d.schema=2;for(const v of Object.values(d.items))v.hidden=false;d.items['board.logo']={x:590,y:0,w:495,h:181,hidden:false};for(const t of TILES){for(const slot of ['solo','p1','p2'])d.items[`tile.${t.index}.${slot}`]={...TOKENS[t.index][slot],w:68,h:96,hidden:false};if(OBJECTS[t.index])for(const [slot,w] of [['flag',38],['building1',54],['building2',66],['building3',82]])d.items[`tile.${t.index}.${slot}`]={x:OBJECTS[t.index].x,y:OBJECTS[t.index].y,w,h:w*({flag:980/784,building1:384/410,building2:487/470,building3:550/695}[slot]),hidden:false};}return d;}
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function validate(input){if(!input)throw Error('INVALID_LAYOUT');let d=copy(input);if(d.schema===1){legacyValidate(d);const next=defaults();for(const [k,v]of Object.entries(d.items))next.items[k]={...v,hidden:false};return next;}
 if(d.schema!==2||d.board!==BOARD||Object.keys(d).sort().join()!=='board,items,schema'||!d.items||Object.keys(d.items).sort().join()!==[...KEYS].sort().join())throw Error('INVALID_LAYOUT');
 const old=legacyDefaults();for(const k of KEYS){const v=d.items[k];if(!v||typeof v.hidden!=='boolean')throw Error('INVALID_VISIBILITY');if(HUD_KEYS.includes(k)&&k!=='board.logo'){const {hidden,...plain}=v;old.items[k]=plain;}else {if(Object.keys(v).sort().join()!=='h,hidden,w,x,y'||!finite(v.x,0,W)||!finite(v.y,0,H)||!finite(v.w,12,600)||!finite(v.h,10,300))throw Error('INVALID_ANCHOR');if(k==='board.logo'&&(v.x+v.w>W+.01||v.y+v.h>H+.01))throw Error('INVALID_BOUNDS');}}
 legacyValidate(old);return d;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),round=v=>Math.round(v*10)/10;
export function adjust(k,old,delta){if(!isAnchor(k)&&k!=='board.logo')return legacyAdjust(k,old,delta);const v={...old,...delta};v.w=round(clamp(v.w,12,600));v.h=round(clamp(v.h,10,300));v.x=round(clamp(v.x,0,W-(isAnchor(k)?0:v.w)));v.y=round(clamp(v.y,0,H-(isAnchor(k)?0:v.h)));return v;}
export function itemRect(k,v){return isAnchor(k)?{...v,x:v.x-v.w/2,y:v.y-v.h*(/\.(solo|p1|p2)$/.test(k)?.88:.5)}:v;}
export function assetFor(k){if(k==='board.logo')return '';if(k.endsWith('.profile'))return `/assets/polimable/editor/${k.startsWith('p1.')?'player1':'player2'}-portrait.png`;const slot=k.split('.')[2];if(['solo','p1','p2'].includes(slot))return `/assets/polimable/characters/${slot==='p2'?'player2':'player1'}/token-257.png`;return `/assets/polimable/objects/${slot==='flag'?'flag-p1':slot.replace('building','building-')}.png`;}
