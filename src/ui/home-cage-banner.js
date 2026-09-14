import { CAGE_TITLE_WIDTHS, CAGE_TITLE_BOUNDS } from '../data/cage-title-metrics.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const advance=text=>Array.from(text).reduce((n,c)=>n+(CAGE_TITLE_WIDTHS[c.codePointAt(0)]??1),0);
const normalized=text=>String(text).normalize('NFKC').replace(/[\s'"‘’“”?!]/g,'');
// Use the approved hand lettering only when it matches the actual published title.
const approvedTitle=normalized("'인사청문회' 게임을 시작해 볼까?");
let serial=0;

function titleLines(title){
 const full=String(title).replace(/\s+/g,' ').trim();let shown='',truncated=false;
 for(const c of full){if(advance(shown+c)>24){truncated=true;break;}shown+=c;}
 if(truncated)shown=shown.trimEnd()+'…';
 if(advance(shown)<=6)return [shown];
 const quoted=shown.match(/^(['"‘“][^'"’”]+['"’”])\s+(.+)$/);
 if(quoted&&advance(quoted[1])<=6&&advance(quoted[2])<=10)return [quoted[1],quoted[2]];
 const chars=Array.from(shown),total=advance(shown);let split=1,best=Infinity;
 for(let i=1;i<chars.length;i++){
  const left=chars.slice(0,i).join('').trim(),right=chars.slice(i).join('').trim();
  if(!left||!right)continue;
  const score=Math.abs(advance(left)-advance(right))+(chars[i]===' '||chars[i-1]===' '?0:total*.12);
  if(score<best){best=score;split=i;}
 }
 return [chars.slice(0,split).join('').trim(),chars.slice(split).join('').trim()];
}

export function renderCageBanner({title,blue=0,red=0}={}){
 const text=String(title||'다음 케이지를 준비 중입니다'),count=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):0;
 const total=count(blue)+count(red),left=total?Math.round(count(blue)*100/total):0,right=total?100-left:0;
 const id=`cage-promo-${++serial}`,original=normalized(text)===approvedTitle,lines=titleLines(text);
 const titleArt=original?`<image href="/assets/banners/cage-approved-156.webp" width="1774" height="887" clip-path="url(#${id}-title)"/>`:
 `<g class="cage-promo-title" fill="url(#${id}-ink)" stroke="#fff4df" stroke-width=".65" paint-order="stroke fill" font-family="JCS Cage Brush,cursive" font-weight="400" text-anchor="middle" transform="translate(887 0) skewX(-8)">${lines.map((line,i)=>{
   const bounds=Array.from(line,c=>CAGE_TITLE_BOUNDS[c.codePointAt(0)]??[-.2,.8]);
   const low=Math.min(0,...bounds.map(b=>b[0])),high=Math.max(.1,...bounds.map(b=>b[1]));
   const height=lines.length===1?230:130,size=Math.min(250,1050/Math.max(advance(line),1),height/(high-low));
   const middle=lines.length===1?228:(i?298:160),baseline=middle+(high+low)*size/2;
   return `<text x="${(Math.tan(8*Math.PI/180)*baseline).toFixed(2)}" y="${baseline.toFixed(2)}" font-size="${size.toFixed(2)}">${esc(line)}</text>`;
 }).join('')}</g>`;
 return `<svg class="cage-promo-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" aria-hidden="true" focusable="false">
 <defs><clipPath id="${id}-title"><rect x="390" y="84" width="1015" height="282"/></clipPath><linearGradient id="${id}-ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset=".58" stop-color="#fff9e8"/><stop offset="1" stop-color="#e5ad44"/></linearGradient></defs>
 <image href="/assets/banners/cage-template-156.webp" width="1774" height="887"/>
 ${titleArt}
 <g fill="#f1fcff" stroke="#def9ff" stroke-width="1" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" transform="translate(132 563) skewY(14)"><text x="78" y="111" font-size="118" textLength="156" lengthAdjust="spacingAndGlyphs">${left}%</text></g>
 <g fill="#fff7f1" stroke="#fff0eb" stroke-width="1" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" transform="translate(1477 615) skewY(-14)"><text x="77" y="108" font-size="118" textLength="154" lengthAdjust="spacingAndGlyphs">${right}%</text></g>
 </svg>`;
}
