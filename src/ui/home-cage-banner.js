import { cageTitleGeometry,cageTitleFontGeometry } from '../core/cage-title-layout.js?v=0.0.31.166';
import { CAGE_TITLE_WIDTHS } from '../data/cage-black-metrics-166.js?v=0.0.31.166';

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
 const geometry=manual||cageTitleFontGeometry(lines,quoted?'first':'equal');
 const titleArt=`<g clip-path="url(#${id}-title)"><g class="cage-promo-title" filter="url(#${id}-title-shadow)" fill="url(#${id}-ink)" font-family="JCS Cage Black,JCS Cage Sans Fallback,sans-serif" font-weight="400" text-anchor="start" style="font-kerning:none;font-variant-ligatures:none" transform="translate(897.5 0)">${geometry.lines.map((line,i)=>`<text data-cage-title-line="${i+1}" x="${line.x.toFixed(2)}" y="${line.baseline.toFixed(2)}" font-size="${line.size.toFixed(2)}">${esc(line.text)}</text>`).join('')}</g></g>`;
 return `<svg class="cage-promo-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" aria-hidden="true" focusable="false">
 <defs><clipPath id="${id}-progressive-board"><polygon points="114,470 291,513 294,742 114,697"/></clipPath><clipPath id="${id}-conservative-board"><polygon points="1472,509 1633,473 1633,704 1468,744"/></clipPath><clipPath id="${id}-title"><rect x="390" y="84" width="1015" height="282"/></clipPath><linearGradient id="${id}-ink" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="356"><stop offset="0" stop-color="#fffdf6"/><stop offset=".58" stop-color="#fff6dc"/><stop offset="1" stop-color="#e7bc66"/></linearGradient><filter id="${id}-title-shadow" x="-5%" y="-10%" width="110%" height="125%"><feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".8"/></filter>
 <filter id="${id}-patch-feather" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="4"/></filter><clipPath id="${id}-patch-bounds"><rect x="688" y="0" width="405" height="114"/><rect x="685" y="414" width="410" height="110"/></clipPath><mask id="${id}-live-patches" maskUnits="userSpaceOnUse" x="688" y="0" width="407" height="524"><g fill="white" filter="url(#${id}-patch-feather)"><rect x="704" y="-12" width="372" height="112" rx="8"/><rect x="701" y="430" width="374" height="78" rx="12"/></g></mask></defs>
 <image id="${id}-template" href="/assets/banners/cage-template-156.webp" width="1774" height="887"/>
 <image href="/assets/banners/cage-live-move-166.png" width="1774" height="887" clip-path="url(#${id}-patch-bounds)" mask="url(#${id}-live-patches)" data-cage-art-patches="header-only" data-cage-live-position="above-vs" data-cage-live-y="439" data-cage-live-bottom="498"/>
 ${titleArt}
 <g class="cage-readout cage-readout--progressive"><use href="#${id}-template" clip-path="url(#${id}-progressive-board)"/><g fill="#f1fcff" stroke="#def9ff" stroke-width="1" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" transform="translate(132 563) skewY(14)"><text x="78" y="111" font-size="118" textLength="156" lengthAdjust="spacingAndGlyphs">${left}%</text></g></g>
 <g class="cage-readout cage-readout--conservative"><use href="#${id}-template" clip-path="url(#${id}-conservative-board)"/><g fill="#fff7f1" stroke="#fff0eb" stroke-width="1" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" transform="translate(1477 615) skewY(-14)"><text x="77" y="108" font-size="118" textLength="154" lengthAdjust="spacingAndGlyphs">${right}%</text></g></g>
 </svg>`;
}
