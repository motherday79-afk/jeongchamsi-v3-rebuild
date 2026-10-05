// Labels remain in their administrative area. City wards are shown after city zoom.
export const REGION_LABEL_FONT=16;
export const districtCity=name=>name.match(/^(.+?시).+구$/)?.[1]||name;
const polygonCache=new Map();
function polygons(path){
 if(!polygonCache.has(path))polygonCache.set(path,(path.match(/M[^M]+/g)||[]).map(s=>{const n=s.match(/-?\d+(?:\.\d+)?/g)?.map(Number)||[];return Array.from({length:Math.floor(n.length/2)},(_,i)=>[n[i*2],n[i*2+1]]);}));
 return polygonCache.get(path);
}
function inPolygon(x,y,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [xi,yi]=points[i],[xj,yj]=points[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
function inGroup(x,y,group){return group.members.some(d=>{const [bx,by,bw,bh]=d.bounds;return x>=bx&&x<=bx+bw&&y>=by&&y<=by+bh&&polygons(d.d).some(p=>inPolygon(x,y,p));});}
export function districtLabelGroups(districts,city=''){
 const groups=new Map();
 for(const d of districts){
  const parent=districtCity(d.name);if(city&&parent!==city)continue;
  const name=city?d.name:parent;
  if(!groups.has(name))groups.set(name,{name,label:city&&parent!==d.name?d.name.slice(parent.length):name,members:[]});
  groups.get(name).members.push(d);
 }
 return [...groups.values()].map(g=>{
  const xs=g.members.map(d=>d.bounds[0]),ys=g.members.map(d=>d.bounds[1]),right=Math.max(...g.members.map(d=>d.bounds[0]+d.bounds[2])),bottom=Math.max(...g.members.map(d=>d.bounds[1]+d.bounds[3]));
  const bounds=[Math.min(...xs),Math.min(...ys),right-Math.min(...xs),bottom-Math.min(...ys)];
  const center=g.members.reduce((best,d)=>d.bounds[2]*d.bounds[3]>best.bounds[2]*best.bounds[3]?d:best).center;
  return {...g,bounds,center,city:!city&&g.members.length>1};
 });
}
export function labelOverlap(a,b){return Math.abs(a.x-b.x)<(a.w+b.w)/2+3&&Math.abs(a.y-b.y)<(a.h+b.h)/2+3;}
function overlapArea(a,b){return Math.max(0,(a.w+b.w)/2+3-Math.abs(a.x-b.x))*Math.max(0,(a.h+b.h)/2+3-Math.abs(a.y-b.y));}
export function layoutRegionLabels(groups,viewBox,width,height){
 const [vx,vy,vw,vh]=viewBox,scale=Math.min(width/vw,height/vh),ox=(width-vw*scale)/2,oy=(height-vh*scale)/2;
 const rows=groups.map(g=>{
  const w=g.label.length*REGION_LABEL_FONT+4,h=22,ax=(g.center[0]-vx)*scale+ox,ay=(g.center[1]-vy)*scale+oy;
  const candidates=[];
  const add=(x,y)=>{if(x-w/2<2||x+w/2>width-2||y-h/2<2||y+h/2>height-2)return;if(!inGroup((x-ox)/scale+vx,(y-oy)/scale+vy,g))return;candidates.push({x,y,w,h,distance:(x-ax)**2+(y-ay)**2});};
  add(ax,ay);
  const [bx,by,bw,bh]=g.bounds;
  for(let y=Math.max(h/2+2,(by-vy)*scale+oy,ay-120);y<=Math.min(height-h/2-2,(by+bh-vy)*scale+oy,ay+120);y+=5){
   for(let x=Math.max(w/2+2,(bx-vx)*scale+ox,ax-120);x<=Math.min(width-w/2-2,(bx+bw-vx)*scale+ox,ax+120);x+=5){if((x-ax)**2+(y-ay)**2<120**2)add(x,y);}
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  // The source centre is the fallback only for malformed / extremely tiny geometry.
  if(!candidates.length)candidates.push({x:ax,y:ay,w,h,distance:0});
  return {...g,...candidates[0],candidates,anchorX:ax,anchorY:ay};
 });
 const order=[...rows].sort((a,b)=>a.candidates.length-b.candidates.length);
 for(let round=0;round<18;round++){
  let changed=false;
  for(const row of round%2?[...order].reverse():order){
   const cost=c=>rows.reduce((sum,other)=>sum+(row===other?0:overlapArea(c,other)*10000),c.distance);
   let best=row,bestCost=cost(row);
   for(const c of row.candidates){const score=cost(c);if(score<bestCost){best=c;bestCost=score;}}
   if(best!==row){Object.assign(row,{x:best.x,y:best.y,distance:best.distance});changed=true;}
  }
  if(!changed)break;
 }
 // Resolve tight neighbouring cities together instead of pushing any label out of its city.
 if(rows.some((a,i)=>rows.slice(i+1).some(b=>labelOverlap(a,b)))){
  let budget=3000;
  const solve=(pending,placed)=>{
   if(!pending.length)return placed;
   if(--budget<0)return null;
   const choices=pending.map(row=>({row,options:row.candidates.filter(c=>placed.every(p=>!labelOverlap(c,p)))})).sort((a,b)=>a.options.length-b.options.length);
   const {row,options}=choices[0];if(!options.length)return null;
   const rest=pending.filter(r=>r!==row);
   for(const c of options){const result=solve(rest,[...placed,{...c,name:row.name}]);if(result)return result;if(budget<0)break;}
   return null;
  };
  const solution=solve(rows,[]);
  if(solution)for(const row of rows){const pos=solution.find(p=>p.name===row.name);Object.assign(row,{x:pos.x,y:pos.y});}
 }
 return rows.map(({candidates,...row})=>({...row,inside:inGroup((row.x-ox)/scale+vx,(row.y-oy)/scale+vy,row)}));
}
export function minimumRegionLabelZoom(groups,box){
 for(const zoom of [1,1.25,1.5,2,2.5,3]){
  const rows=layoutRegionLabels(groups,box,680*zoom,700*zoom);
  if(!rows.some((a,i)=>rows.slice(i+1).some(b=>labelOverlap(a,b))))return zoom;
 }
 return 3;
}
