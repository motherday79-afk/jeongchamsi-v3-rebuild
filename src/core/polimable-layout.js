// 32-cell square route. Corner cells: 0/8/16/24. START is bottom-right; movement is counterclockwise.
const x0=8.0,y0=8.0,x1=92.0,y1=92.0;
const corner=10.0;
const hStep=(x1-x0-2*corner)/7;
const vStep=(y1-y0-2*corner)/7;
const cells=[];
const push=(index,x,y,w,h,side,cornerCell=false)=>cells.push({index,x,y,w,h,side,corner:cornerCell});
// bottom: 0 START at right, then 1..7 toward left, 8 bottom-left
push(0,x1-corner,y1-corner,corner,corner,'bottom',true);
for(let i=1;i<=7;i++)push(i,x1-corner-i*hStep,y1-corner,hStep,corner,'bottom');
push(8,x0,y1-corner,corner,corner,'bottom',true);
// left: 9..15 upward, 16 top-left
for(let i=1;i<=7;i++)push(8+i,x0,y1-corner-i*vStep,corner,vStep,'left');
push(16,x0,y0,corner,corner,'left',true);
// top: 17..23 rightward, 24 top-right
for(let i=1;i<=7;i++)push(16+i,x0+corner+(i-1)*hStep,y0,hStep,corner,'top');
push(24,x1-corner,y0,corner,corner,'top',true);
// right: 25..31 downward
for(let i=1;i<=7;i++)push(24+i,x1-corner,y0+corner+(i-1)*vStep,corner,vStep,'right');
export const POLIMARBLE_32_TILE_LAYOUT=Object.freeze(cells.sort((a,b)=>a.index-b.index));
