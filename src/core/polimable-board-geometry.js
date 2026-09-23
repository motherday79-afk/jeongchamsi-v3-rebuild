import {tileOutline,roundPolygon} from './polimable-tile-outline.js?v=0.0.31.261';
export const BOARD270={width:1672,height:941,cx:836,cy:453,pitch:76,depth:120,length:772,slope:.515,gap:2.5,thickness:14};
export const projectPlane=(u,v)=>[836+u-v,453+(u+v-772)*.515];
export function boardTile(i){
 if(!Number.isInteger(i)||i<0||i>31)throw Error('INVALID_TILE');
 const n=i%8,side=Math.floor(i/8),L=772,D=120,P=76,inset=1.25;let u,v,w,h;
 if(!n){[u,v]=[[L-D,L-D],[0,L-D],[0,0],[L-D,0]][side];w=h=D;}
 else if(side===0){u=L-D-n*P;v=L-D;w=P;h=D;}
 else if(side===1){u=0;v=L-D-n*P;w=D;h=P;}
 else if(side===2){u=D+(n-1)*P;v=0;w=P;h=D;}
 else{u=L-D;v=D+(n-1)*P;w=D;h=P;}
 const points=[[u+inset,v+inset],[u+w-inset,v+inset],[u+w-inset,v+h-inset],[u+inset,v+h-inset]].map(([a,b])=>projectPlane(a,b));
 const center=projectPlane(u+w/2,v+h/2),[top,right,bottom,left]=points,thickness=14;
 return {index:i,side,corner:n===0,u,v,w,h,points,center,thickness,top:roundPolygon(points,n===0?8:4),footprint:roundPolygon([top,right,[right[0],right[1]+thickness],[bottom[0],bottom[1]+thickness],[left[0],left[1]+thickness],left],4)};
}
const basis=p=>{const[a,b,c,d]=p;return {x:(a[0]+b[0]+c[0]+d[0])/4,y:(a[1]+b[1]+c[1]+d[1])/4,ux:(b[0]-a[0]+c[0]-d[0])/2,uy:(b[1]-a[1]+c[1]-d[1])/2,vx:(d[0]-a[0]+c[0]-b[0])/2,vy:(d[1]-a[1]+c[1]-b[1])/2};};
export function remapPoint(i,p,inverse=false){const old=basis(tileOutline(i).points),next=basis(boardTile(i).points),a=inverse?next:old,b=inverse?old:next,dx=p.x-a.x,dy=p.y-a.y,det=a.ux*a.vy-a.uy*a.vx,u=(dx*a.vy-dy*a.vx)/det,v=(dy*a.ux-dx*a.uy)/det;return {x:b.x+b.ux*u+b.vx*v,y:b.y+b.uy*u+b.vy*v};}
export const ITEM_SCALE=1.08;
export function projectItem(key,value){if(!key.startsWith('tile.'))return {...value};const i=Number(key.split('.')[1]);return {...value,...remapPoint(i,value),w:value.w*ITEM_SCALE,h:value.h*ITEM_SCALE,...('font'in value?{font:value.font*ITEM_SCALE}:{})};}
export function unprojectDelta(key,dx,dy){if(!key.startsWith('tile.'))return {x:dx,y:dy};const i=Number(key.split('.')[1]),c=boardTile(i).center,a=remapPoint(i,{x:c[0],y:c[1]},true),b=remapPoint(i,{x:c[0]+dx,y:c[1]+dy},true);return {x:b.x-a.x,y:b.y-a.y};}
// Exact affine mapping between corresponding triangles. Used for legacy corner artwork.
export function triangleMatrix(src,dst){const[a,b,c]=src,[p,q,r]=dst,ux=b[0]-a[0],uy=b[1]-a[1],vx=c[0]-a[0],vy=c[1]-a[1],det=ux*vy-uy*vx,A=((q[0]-p[0])*vy-(r[0]-p[0])*uy)/det,B=((q[1]-p[1])*vy-(r[1]-p[1])*uy)/det,C=((r[0]-p[0])*ux-(q[0]-p[0])*vx)/det,D=((r[1]-p[1])*ux-(q[1]-p[1])*vx)/det;return [A,B,C,D,p[0]-A*a[0]-C*a[1],p[1]-B*a[0]-D*a[1]];}
