// Reproduce the vendored administrative geometry. Requires Node 18+, no packages.
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const revision = '06c7a3456dd82965bd29042130441515717519ab';
const base = `https://raw.githubusercontent.com/DevMinGeonPark/mapcn-kr/${revision}/`;
const sourceFiles = ['data/sido.json', 'data/sgg.json', 'LICENSE-DATA'];
const source = await Promise.all(sourceFiles.map(async file => {
  const response = await fetch(base + file);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.text();
}));
const [sido, sgg] = source.slice(0, 2).map(JSON.parse);
const shortNames = {11:'서울',26:'부산',27:'대구',28:'인천',12:'전남광주',30:'대전',31:'울산',36:'세종',41:'경기',51:'강원',43:'충북',44:'충남',47:'경북',48:'경남',50:'제주',52:'전북'};
const rawProject = ([lon, lat]) => [lon * Math.PI / 180, -Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
const polygons = geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
const allPoints = [...sido.features, ...sgg.features].flatMap(f => polygons(f.geometry).flat(2)).map(rawProject);
const extent = points => points.reduce((b,[x,y]) => [Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)], [Infinity,Infinity,-Infinity,-Infinity]);
const [minX,minY,maxX,maxY] = extent(allPoints);
const scale = Math.min(568/(maxX-minX),688/(maxY-minY));
const offsetX = (600-(maxX-minX)*scale)/2;
const offsetY = (720-(maxY-minY)*scale)/2;
const round = n => Math.round(n*10)/10;
const project = point => {
  const [x,y] = rawProject(point);
  return [round(offsetX+(x-minX)*scale),round(offsetY+(y-minY)*scale)];
};
const signedArea = ring => ring.reduce((sum,a,i) => { const b=ring[(i+1)%ring.length]; return sum+a[0]*b[1]-b[0]*a[1]; },0)/2;
const insideRing = (p,ring) => {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i], b=ring[j];
    if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
};
function labelCenter(poly) {
  const ring=poly[0], area=signedArea(ring);
  const sum=ring.reduce((c,a,i) => {const b=ring[(i+1)%ring.length], cross=a[0]*b[1]-b[0]*a[1];return [c[0]+(a[0]+b[0])*cross,c[1]+(a[1]+b[1])*cross];},[0,0]);
  const candidate=area ? sum.map(v=>v/(6*area)) : ring[0];
  const inside=p=>insideRing(p,ring)&&!poly.slice(1).some(hole=>insideRing(p,hole));
  if(inside(candidate)) return candidate.map(round);
  const [x0,y0,x1,y1]=extent(ring);
  let best=ring[0], distance=Infinity;
  for(let y=0;y<30;y++) for(let x=0;x<30;x++) {
    const p=[x0+(x+.5)*(x1-x0)/30,y0+(y+.5)*(y1-y0)/30];
    const d=(p[0]-candidate[0])**2+(p[1]-candidate[1])**2;
    if(d<distance&&inside(p)) {best=p;distance=d;}
  }
  return best.map(round);
}
function geometryRecord(feature, district) {
  const p=feature.properties;
  const projected=polygons(feature.geometry).map(poly=>poly.map(ring=>ring.map(project)));
  const d=projected.flatMap(poly=>poly.map(ring=>`M${ring.map(point=>point.join(',')).join('L')}Z`)).join('');
  const largest=projected.reduce((best,poly)=>Math.abs(signedArea(poly[0]))>Math.abs(signedArea(best[0]))?poly:best);
  const [bx0,by0,bx1,by1]=extent(projected.flat(2));
  const bounds=[bx0,by0,bx1-bx0,by1-by0].map(round);
  return district
    ? {code:p.sgg,name:p.sggnm,region:shortNames[p.sido],regionCode:p.sido,d,center:labelCenter(largest),bounds}
    : {code:p.sido,name:shortNames[p.sido],fullName:p.sidonm,d,center:labelCenter(largest),bounds};
}
const regions=sido.features.map(f=>geometryRecord(f,false));
const districts=sgg.features.map(f=>geometryRecord(f,true));
if(regions.length!==16||districts.length!==256||regions.some(r=>!r.name)||districts.some(d=>!d.region)) throw new Error('Unexpected source schema');
const output=`// Generated administrative boundaries, not electoral constituencies. See docs/maps/README.md.\n// Source: Statistics Korea SGIS, vuski/admdongkor, DevMinGeonPark/mapcn-kr (CC BY 4.0).\nexport const MAP_VIEWBOX = '0 0 600 720';\nexport const MAP_BOUNDARY_DATE = '2026-07-01';\nexport const MAP_REGIONS = ${JSON.stringify(regions)};\nexport const MAP_DISTRICTS = ${JSON.stringify(districts)};\n`;
await mkdir(new URL('../../src/data/',import.meta.url),{recursive:true});
await writeFile(new URL('../../src/data/political-map-geometry.js',import.meta.url),output);
await writeFile(new URL('./LICENSE-DATA',import.meta.url),source[2]);
await writeFile(new URL('./source-manifest.json',import.meta.url),JSON.stringify({repository:'https://github.com/DevMinGeonPark/mapcn-kr',revision,boundaryDate:'2026-07-01',files:sourceFiles.map((file,i)=>({file,url:base+file,sha256:createHash('sha256').update(source[i]).digest('hex')})),regions:regions.length,districts:districts.length},null,2)+'\n');
console.log(JSON.stringify({regions:regions.length,districts:districts.length,bytes:Buffer.byteLength(output)}));
