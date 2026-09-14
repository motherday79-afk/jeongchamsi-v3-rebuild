// Also imported by the API: keep shared dependency paths traceable by Vercel.
import { CAGE_TITLE_WIDTHS, CAGE_TITLE_BOUNDS, CAGE_TITLE_X_BOUNDS } from '../data/cage-brush-metrics.js';
import { CAGE_TITLE_WIDTHS as LEGACY_WIDTHS, CAGE_TITLE_BOUNDS as LEGACY_BOUNDS } from '../data/cage-title-metrics.js';
export const CAGE_BRUSH_SKEW=22;
export const CAGE_BRUSH_TRACKING=-.028;
export const CAGE_BRUSH_WIDTH=1.35;
const slant=Math.tan(CAGE_BRUSH_SKEW*Math.PI/180);
export const normalizeCageTitle=value=>String(value??'').replace(/\s+/g,' ').trim();
const fail=code=>{throw new Error(code);};
function metrics(text,widthScale=1){
 let advance=0,left=Infinity,right=-Infinity,low=Infinity,high=-Infinity;
 const chars=Array.from(text);
 chars.forEach((char,index)=>{
  const code=char.codePointAt(0),[bottom,top]=CAGE_TITLE_BOUNDS[code]??[-.2,.8],[x0,x1]=CAGE_TITLE_X_BOUNDS[code]??[0,1];
  if(char.trim()){
   left=Math.min(left,widthScale*(advance+x0)+slant*bottom);right=Math.max(right,widthScale*(advance+x1)+slant*top);
   low=Math.min(low,bottom);high=Math.max(high,top);
  }
  advance+=(CAGE_TITLE_WIDTHS[code]??1)+(index<chars.length-1?CAGE_BRUSH_TRACKING:0);
 });
 if(!Number.isFinite(left))return {advance,left:0,right:0,low:0,high:1};
 return {advance,left,right,low,high};
}
export function cageBrushGeometry(texts,emphasis='equal'){
 const factors=texts.length===1?[1]:emphasis==='first'?[1.2,.88]:emphasis==='second'?[.88,1.2]:[1,1];
 const measures=texts.map(text=>metrics(text)),factorTotal=factors.reduce((a,b)=>a+b,0),height=texts.length===1?254:244;
 const base=Math.min(280,...measures.map((m,i)=>Math.min(995/Math.max(m.right-m.left,.1)/factors[i],height/factorTotal/Math.max(m.high-m.low,.1))));
 let top=94;
 const lines=texts.map((text,i)=>{
  const size=base*factors[i];
  let lower=1,upper=CAGE_BRUSH_WIDTH;
  for(let pass=0;pass<12;pass++){const scale=(lower+upper)/2,m=metrics(text,scale);if((m.right-m.left)*size<=995)lower=scale;else upper=scale;}
  const widthScale=lower,m=metrics(text,widthScale),slot=height*factors[i]/factorTotal,inkHeight=(m.high-m.low)*size,lineTop=top+(slot-inkHeight)/2,baseline=lineTop+m.high*size;
  top+=slot+10;
  return {text,size,widthScale,baseline,width:m.advance*size,projectedWidth:(m.right-m.left)*size,x:(slant*baseline-(m.left+m.right)*size/2)/widthScale,top:lineTop,bottom:lineTop+inkHeight};
 });
 return {lines,emphasis};
}
// Preserve the admission boundary of released 159 layouts. Font-size values
// describe different ink sizes in the two faces; a new face must not erase a
// previously valid administrator line break. The actual rendering still fits
// the Rock ink bounds above, including its smaller size when necessary.
function releasedLayoutFits(texts,emphasis){
 const factors=texts.length===1?[1]:emphasis==='first'?[1.2,.88]:emphasis==='second'?[.88,1.2]:[1,1];
 const total=factors.reduce((a,b)=>a+b,0),height=texts.length===1?254:240;
 const sizes=texts.map((text,i)=>{
  const chars=Array.from(text),bounds=chars.map(c=>LEGACY_BOUNDS[c.codePointAt(0)]??[-.2,.8]);
  const advance=chars.reduce((sum,c)=>sum+(LEGACY_WIDTHS[c.codePointAt(0)]??1),0);
  const inkHeight=Math.max(.1,...bounds.map(b=>b[1]))-Math.min(0,...bounds.map(b=>b[0]));
  return Math.min(985/Math.max(advance,1)/factors[i],height/total/inkHeight);
 });
 return Math.min(250,...sizes)*Math.min(...factors)>=84;
}
function geometry(title,layout){
 const chars=Array.from(title),texts=layout.breakAt?[chars.slice(0,layout.breakAt).join('').trim(),chars.slice(layout.breakAt).join('').trim()]:[title];
 if(texts.some(t=>!t))fail('CAGE_TITLE_BREAK_INVALID');
 const result=cageBrushGeometry(texts,layout.emphasis);
 if(result.lines.some(line=>line.size<84)&&!releasedLayoutFits(texts,layout.emphasis))fail('CAGE_TITLE_TOO_LONG');
 return result;
}
export function validateCageTitleLayout(title,input){
 const actual=normalizeCageTitle(title);
 if(!input||typeof input!=='object'||normalizeCageTitle(input.title)!==actual)fail('CAGE_TITLE_CHANGED');
 const breakAt=Number(input.breakAt),length=Array.from(actual).length;
 if(!Number.isInteger(breakAt)||breakAt<0||breakAt>=length)fail('CAGE_TITLE_BREAK_INVALID');
 if(breakAt!==0&&!cageBreakOptions(actual).some(option=>option.index===breakAt))fail('CAGE_TITLE_BREAK_INVALID');
 if(!['first','second','equal'].includes(input.emphasis))fail('CAGE_TITLE_EMPHASIS_INVALID');
 const safe={title:actual,breakAt,emphasis:input.emphasis};geometry(actual,safe);return safe;
}
export function cageTitleGeometry(title,layout){
 if(!layout)return null;
 try{const safe=validateCageTitleLayout(title,layout);return geometry(safe.title,safe);}catch{return null;}
}
export function cageBreakOptions(title){
 const text=normalizeCageTitle(title),chars=Array.from(text),spaces=chars.map((c,i)=>c===' '?i:-1).filter(i=>i>0&&i<chars.length-1);
 return (spaces.length?spaces:chars.slice(1).map((_,i)=>i+1)).map(index=>({index,first:chars.slice(0,index).join('').trim(),second:chars.slice(index).join('').trim()}));
}
