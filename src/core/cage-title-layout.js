import { CAGE_TITLE_WIDTHS, CAGE_TITLE_BOUNDS } from '../data/cage-title-metrics.js';
export const normalizeCageTitle=value=>String(value??'').replace(/\s+/g,' ').trim();
const fail=code=>{throw new Error(code);};
const metrics=text=>{const chars=Array.from(text),bounds=chars.map(c=>CAGE_TITLE_BOUNDS[c.codePointAt(0)]??[-.2,.8]);return {advance:chars.reduce((sum,c)=>sum+(CAGE_TITLE_WIDTHS[c.codePointAt(0)]??1),0),low:Math.min(0,...bounds.map(b=>b[0])),high:Math.max(.1,...bounds.map(b=>b[1]))};};
function geometry(title,layout){
 const chars=Array.from(title),texts=layout.breakAt?[chars.slice(0,layout.breakAt).join('').trim(),chars.slice(layout.breakAt).join('').trim()]:[title];
 if(texts.some(t=>!t))fail('CAGE_TITLE_BREAK_INVALID');
 const factors=texts.length===1?[1]:layout.emphasis==='first'?[1.2,.88]:layout.emphasis==='second'?[.88,1.2]:[1,1];
 const measures=texts.map(metrics),factorTotal=factors.reduce((a,b)=>a+b,0),height=texts.length===1?254:254-14;
 const base=Math.min(250,...measures.map((m,i)=>Math.min(985/Math.max(m.advance,1)/factors[i],height/factorTotal/(m.high-m.low))));
 if(base*Math.min(...factors)<84)fail('CAGE_TITLE_TOO_LONG');
 let top=98;const lines=texts.map((text,i)=>{const m=measures[i],size=base*factors[i],slot=height*factors[i]/factorTotal,inkHeight=(m.high-m.low)*size,lineTop=top+(slot-inkHeight)/2,baseline=lineTop+m.high*size;top+=slot+14;return {text,size,baseline,width:m.advance*size,top:lineTop,bottom:lineTop+inkHeight};});
 return {lines,emphasis:layout.emphasis};
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
