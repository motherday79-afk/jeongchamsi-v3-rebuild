import { cageTitleGeometry,cageBrushGeometry,CAGE_BRUSH_SKEW,CAGE_BRUSH_TRACKING } from '../core/cage-title-layout.js?v=0.0.31.163';
import { CAGE_TITLE_WIDTHS } from '../data/cage-brush-metrics.js?v=0.0.31.160';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const advance=text=>Array.from(text).reduce((n,c)=>n+(CAGE_TITLE_WIDTHS[c.codePointAt(0)]??1),0);
let serial=0;

function titleLines(title){
 const full=String(title).replace(/\s+/g,' ').trim();let shown='',truncated=false;
 for(const c of full){if(advance(shown+c)>24){truncated=true;break;}shown+=c;}
 if(truncated)shown=shown.trimEnd()+'…';
 if(advance(shown)<=6)return [shown];
 const quoted=shown.match(/^(['"‘“][^'"’”]+['"’”])\s+(.+)$/);
 if(quoted&&advance(quoted[1])<=6&&advance(quoted[2])<=10)return [quoted[1],quoted[2]];
 const chars=Array.from(shown),total=advance(shown),hasSpaces=shown.includes(' ');let split=1,best=Infinity;
 for(let i=1;i<chars.length;i++){
  if(hasSpaces&&chars[i]!==' ')continue;
  const left=chars.slice(0,i).join('').trim(),right=chars.slice(i).join('').trim();
  if(!left||!right)continue;
  const score=Math.abs(advance(left)-advance(right))+(chars[i]===' '||chars[i-1]===' '?0:total*.12);
  if(score<best){best=score;split=i;}
 }
 return [chars.slice(0,split).join('').trim(),chars.slice(split).join('').trim()];
}

export function renderCageBanner({title,titleLayout=null,blue=0,red=0}={}){
 const text=String(title||'다음 케이지를 준비 중입니다'),count=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):0;
 const total=count(blue)+count(red),left=total?Math.round(count(blue)*100/total):0,right=total?100-left:0;
 const id=`cage-promo-${++serial}`,manual=cageTitleGeometry(text,titleLayout),lines=manual?manual.lines.map(line=>line.text):titleLines(text);
 const quoted=lines.length===2&&/^['"‘“].+['"’”]$/.test(lines[0]);
 const geometry=manual||cageBrushGeometry(lines,quoted?'first':'equal');
 const titleArt=`<g clip-path="url(#${id}-title)"><g class="cage-promo-title" filter="url(#${id}-brush)" mask="url(#${id}-grain-mask)" fill="url(#${id}-ink)" stroke="#fff1c9" stroke-width=".6" stroke-linejoin="round" paint-order="stroke fill" font-family="JCS Cage Rock,JCS Cage Brush,cursive" font-weight="400" text-anchor="start" style="font-kerning:none;font-variant-ligatures:none" transform="translate(897.5 0) skewX(-${CAGE_BRUSH_SKEW})">${geometry.lines.map((line,i)=>`<text transform="scale(${line.widthScale.toFixed(5)} 1)" data-cage-title-line="${i+1}" x="${line.x.toFixed(2)}" y="${line.baseline.toFixed(2)}" font-size="${line.size.toFixed(2)}" letter-spacing="${(CAGE_BRUSH_TRACKING*line.size).toFixed(2)}">${esc(line.text)}</text>`).join('')}</g></g>`;
 return `<svg class="cage-promo-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" aria-hidden="true" focusable="false">
 <defs><pattern id="${id}-grain" width="94" height="81" patternUnits="userSpaceOnUse"><rect width="94" height="81" fill="white"/><path d="M15 4l-2 28 1-2 3-25z M54 18l-4 49 2-6 4-41z M78 2l-1 16 2-5z M27 49l-3 26 2-8 2-15z" fill="black" opacity=".18"/></pattern><mask id="${id}-grain-mask" maskUnits="userSpaceOnUse" x="-1000" y="0" width="2000" height="450"><rect x="-1000" y="0" width="2000" height="450" fill="url(#${id}-grain)"/></mask><clipPath id="${id}-title"><rect x="390" y="84" width="1015" height="282"/></clipPath><linearGradient id="${id}-ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset=".55" stop-color="#fff7dd"/><stop offset=".8" stop-color="#f4d28a"/><stop offset="1" stop-color="#c88b36"/></linearGradient><filter id="${id}-brush" x="-5%" y="-10%" width="110%" height="125%"><feTurbulence type="fractalNoise" baseFrequency=".055 .22" numOctaves="2" seed="8" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale=".5" xChannelSelector="R" yChannelSelector="G" result="ink"/><feDropShadow in="ink" dx="1" dy="1.5" stdDeviation=".5" flood-color="#352009" flood-opacity=".95"/></filter></defs>
 <image href="/assets/banners/cage-template-156.webp" width="1774" height="887"/>
 ${titleArt}
 <g fill="#f1fcff" stroke="#def9ff" stroke-width="1" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" transform="translate(132 563) skewY(14)"><text x="78" y="111" font-size="118" textLength="156" lengthAdjust="spacingAndGlyphs">${left}%</text></g>
 <g fill="#fff7f1" stroke="#fff0eb" stroke-width="1" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" transform="translate(1477 615) skewY(-14)"><text x="77" y="108" font-size="118" textLength="154" lengthAdjust="spacingAndGlyphs">${right}%</text></g>
 </svg>`;
}
