import * as base from './polimable-scene-layout.js';
export * from './polimable-scene-layout.js';
export const isLabel=k=>/^tile\.\d+\.label$/.test(k);
export const SLOTS={...base.SLOTS,label:'칸 이름 · 색상 · 방향'};
export const KEYS=[...base.KEYS,...base.TILES.map(t=>`tile.${t.index}.label`)];
export const isImage=k=>!isLabel(k)&&base.isImage(k);
export const fieldTitle=k=>isLabel(k)?`${base.TILES[Number(k.split('.')[1])].tileNo}번 · 칸 디자인`:base.fieldTitle(k);
// Face centres match the printed artwork, independently of character landing anchors.
const centres=[[817,833],[686,772],[621,732],[558,691],[493,649],[429,612],[364,574],[303,536],[213,516],[308,437],[387,400],[460,365],[531,330],[601,298],[671,266],[735,235],[829,227],[928,235],[997,268],[1064,301],[1134,333],[1206,368],[1282,407],[1363,443],[1450,516],[1366,536],[1308,574],[1235,612],[1170,649],[1103,690],[1028,731],[957,772]];
export const faceGeometry=i=>{const t=base.TILES[i];if(t.corner){const [x,y,w,h]=({0:[818,817,210,133],8:[213,490,178,102],16:[832,202,163,91],24:[1455,491,178,100]})[i];return {x,y,w,h};}const [x,y]=centres[i];return {x,y,w:t.side==='blue'?140:128,h:68};};
export function labelDefaults(i){const t=base.TILES[i],[x,y]=centres[i];return {x,y,w:t.corner?174:112,h:t.corner?38:32,hidden:false,text:t.label,font:t.corner?25:18,color:t.corner?'#FFFFFF':'#142E68',background:{green:'#9AF64B',blue:'#5EE6FF',purple:'#F581F1',orange:'#FFD84A',corner:'#6D37AD'}[t.side],background2:'#FFFFFF',split:false,rotation:0,writing:'horizontal-tb'};}
export function defaults(){const d=base.defaults();d.schema=3;for(const t of base.TILES)d.items[`tile.${t.index}.label`]=labelDefaults(t.index);return d;}
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const hex=s=>typeof s==='string'&&/^#[\da-f]{6}$/i.test(s);
export function validate(input){if(input?.schema===1||input?.schema===2){const d=base.validate(input);const next=defaults();Object.assign(next.items,d.items);return next;}const d=base.copy(input);if(!d||d.schema!==3||d.board!==base.BOARD||Object.keys(d).sort().join()!=='board,items,schema'||!d.items||Object.keys(d.items).sort().join()!==[...KEYS].sort().join())throw Error('INVALID_LAYOUT');const legacy={schema:2,board:d.board,items:{}};for(const k of base.KEYS)legacy.items[k]=d.items[k];base.validate(legacy);for(const t of base.TILES){const v=d.items[`tile.${t.index}.label`];if(!v||Object.keys(v).sort().join()!==Object.keys(labelDefaults(t.index)).sort().join()||typeof v.text!=='string'||!v.text.trim()||v.text.length>24||/[\u0000-\u001f\u007f]/.test(v.text)||typeof v.hidden!=='boolean'||typeof v.split!=='boolean'||!hex(v.color)||!hex(v.background)||!hex(v.background2)||!finite(v.x,0,base.W)||!finite(v.y,0,base.H)||!finite(v.w,12,600)||!finite(v.h,10,300)||!finite(v.font,10,72)||!finite(v.rotation,-180,180)||!['horizontal-tb','vertical-rl'].includes(v.writing))throw Error('INVALID_TILE_DESIGN');}return d;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function adjust(k,old,delta){if(!isLabel(k))return base.adjust(k,old,delta);const v={...old,...delta};for(const [p,min,max] of [['x',0,base.W],['y',0,base.H],['w',12,600],['h',10,300],['font',10,72],['rotation',-180,180]])v[p]=Math.round(clamp(v[p],min,max)*10)/10;return v;}
export const itemRect=(k,v)=>isLabel(k)?{...v,x:v.x-v.w/2,y:v.y-v.h/2}:base.itemRect(k,v);
export const tileName=(layout,i)=>layout?.items?.[`tile.${i}.label`]?.text||base.TILES[i]?.label||`칸 ${i}`;
export const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
