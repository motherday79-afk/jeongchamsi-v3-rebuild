// JCS 0.0.31.251 · Diamond precision remap: token / profile / ownership anchors
// DESIGN SOURCE OF TRUTH: polimable-board-base-31-249.png (1672×941)
// Exactly 32 movement positions: 28 same-size small cells + 4 same-size corner cells.
// Internal index 0 is START (= logical tile no. 32). Then 1..31 follow counter-clockwise.
// Strategy-card cells are logical tile nos. 4, 12, 20, 28.

const cell=(index,tileNo,side,corner,cx,cy,w,h,rot,label,type='property')=>Object.freeze({index,tileNo,side,corner,cx,cy,w,h,rot,label,type});
const hud=(id,cx,cy,w,h,rot=0)=>Object.freeze({id,cx,cy,w,h,rot});

const SW=132, SH=58, CW=192, CH=102;

export const POLIMARBLE_32_TILE_LAYOUT=Object.freeze([
  // 32 · START (bottom corner)
  cell(0,32,'corner',true,813,817,CW,CH,0,'START','start'),

  // 1~7 · START -> left corner (green line)
  cell(1,1,'green',false,682,758,SW,SH,27,'임팩트G'),
  cell(2,2,'green',false,607,718,SW,SH,27,'굿파트너스'),
  cell(3,3,'green',false,533,679,SW,SH,27,'핀임팩트'),
  cell(4,4,'green',false,461,640,SW,SH,27,'전략카드','card'),
  cell(5,5,'green',false,389,600,SW,SH,27,'휴먼링크'),
  cell(6,6,'green',false,318,561,SW,SH,27,'인브릿지'),
  cell(7,7,'green',false,253,523,SW,SH,27,'온케어'),

  // 8 · left corner
  cell(8,8,'corner',true,213,482,CW,CH,0,'희망의 재단','hope'),

  // 9~15 · left corner -> top corner (blue line)
  cell(9,9,'blue',false,302,429,SW,SH,-27,'키워크'),
  cell(10,10,'blue',false,376,393,SW,SH,-27,'시트너스'),
  cell(11,11,'blue',false,447,359,SW,SH,-27,'컴웨이'),
  cell(12,12,'blue',false,520,324,SW,SH,-27,'전략카드','card'),
  cell(13,13,'blue',false,592,292,SW,SH,-27,'퍼브릿지'),
  cell(14,14,'blue',false,656,260,SW,SH,-27,'시민링크'),
  cell(15,15,'blue',false,721,229,SW,SH,-27,'로컬온'),

  // 16 · top corner
  cell(16,16,'corner',true,819,197,CW,CH,0,'운명의 선택','fate'),

  // 17~23 · top corner -> right corner (purple/pink line)
  cell(17,17,'purple',false,910,230,SW,SH,27,'JCS RS'),
  cell(18,18,'purple',false,975,262,SW,SH,27,'JCS TV'),
  cell(19,19,'purple',false,1038,294,SW,SH,27,'E퍼블릭'),
  cell(20,20,'purple',false,1104,328,SW,SH,27,'전략카드','card'),
  cell(21,21,'purple',false,1172,362,SW,SH,27,'폴리시빅'),
  cell(22,22,'purple',false,1237,395,SW,SH,27,'넥스트랩'),
  cell(23,23,'purple',false,1304,429,SW,SH,27,'폴리피아'),

  // 24 · right corner
  cell(24,24,'corner',true,1445,482,CW,CH,0,'욕망의 굴레','desire'),

  // 25~31 · right corner -> START (orange line)
  cell(25,25,'orange',false,1388,526,SW,SH,-27,'MBU'),
  cell(26,26,'orange',false,1323,562,SW,SH,-27,'KCA'),
  cell(27,27,'orange',false,1256,601,SW,SH,-27,'BCS'),
  cell(28,28,'orange',false,1187,640,SW,SH,-27,'전략카드','card'),
  cell(29,29,'orange',false,1115,678,SW,SH,-27,'웨이브'),
  cell(30,30,'orange',false,1041,717,SW,SH,-27,'프레스윈'),
  cell(31,31,'orange',false,967,759,SW,SH,-27,'온데일리')
]);

// Independent fixed UI objects in the new background.
export const POLIMARBLE_HUD_LAYOUT=Object.freeze([
  hud('player-1',207,105,385,168,0),
  hud('player-2',1464,105,385,168,0),
  hud('dice-roll',1488,834,286,104,0)
]);

export const POLIMARBLE_CORNER_INDICES=Object.freeze([0,8,16,24]);
export const POLIMARBLE_STRATEGY_INDICES=Object.freeze([4,12,20,28]);

const anchor=(index,x,y,label='')=>Object.freeze({index,x:(x/1672)*100,y:(y/941)*100,label});
export const POLIMARBLE_MOVE_ANCHORS=Object.freeze(POLIMARBLE_32_TILE_LAYOUT.map(t=>anchor(t.index,t.cx,t.cy,t.label)));

// Precise character landing coordinates.  Every tile has a solo point and a pair of
// side-by-side points.  This prevents 1P / 2P overlap when both players land together.
const tokenPlacement=t=>{
  const angle=(t.corner?0:t.rot)*Math.PI/180;
  const spread=t.corner?42:36;
  const dx=Math.cos(angle)*spread,dy=Math.sin(angle)*spread;
  return Object.freeze({
    index:t.index,tileNo:t.tileNo,label:t.label,
    solo:Object.freeze({x:t.cx,y:t.cy}),
    p1:Object.freeze({x:t.cx-dx,y:t.cy-dy}),
    p2:Object.freeze({x:t.cx+dx,y:t.cy+dy})
  });
};
export const POLIMARBLE_TOKEN_POINTS=Object.freeze(POLIMARBLE_32_TILE_LAYOUT.map(tokenPlacement));

// One shared external object position per purchasable company.
// The same position is reused for ownership flag -> building 1 -> building 2 -> building 3.
// Points are derived from the exact tile center and pushed outward from the diamond centre,
// so the company name remains readable and the ownership object stays visually attached.
const BOARD_CENTER=Object.freeze({x:836,y:474});
const propertyObjectPoint=t=>{
  const vx=t.cx-BOARD_CENTER.x,vy=t.cy-BOARD_CENTER.y;
  const len=Math.hypot(vx,vy)||1;
  const distance=54;
  return Object.freeze({x:Math.round(t.cx+vx/len*distance),y:Math.round(t.cy+vy/len*distance),side:t.side});
};
export const POLIMARBLE_PROPERTY_OBJECT_POINTS=Object.freeze(Object.fromEntries(
  POLIMARBLE_32_TILE_LAYOUT.filter(t=>!t.corner&&t.type==='property').map(t=>[t.index,propertyObjectPoint(t)])
));

// Backward-compatible alias for older code/tests.
export const POLIMARBLE_OWNER_BADGE_POINTS=POLIMARBLE_PROPERTY_OBJECT_POINTS;
