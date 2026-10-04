import {renderShareMenu} from '../ui/page-share.js?v=0.0.31.427';
import {moduleActionIconSvg} from '../ui/service-icons.js?v=0.0.31.394';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=v=>/^\/assets\/[a-zA-Z0-9_./-]+$/.test(v||'')||/^https:\/\//.test(v||'')?esc(v):'';
const link=(path,label,cls='')=>`<a class="${cls}" href="${path}" data-layout-route="${path}">${label}</a>`;
const issue=p=>String(p.number||1).padStart(2,'0');
const image=p=>`<img src="${safe(p.coverImage||p.image)}" alt="${esc(p.title)} · 네 장면의 웹툰" loading="lazy" decoding="async" width="1536" height="1024">`;
const brand='<span class="comic-wordmark">정치<span>4</span>컷<i>JCS TOON</i></span>';
export function renderComicHome(result={}){
 const rows=(result.items||[]).slice(0,3);
 return '<section class="political-comic-home" id="political-comic"><div class="module-header"><div><span class="eyebrow">JCS POLITICAL TOON</span><h2>정치4컷</h2></div><button class="module-icon-action" type="button" data-layout-route="/political-comic" aria-label="정치4컷 전체 회차" title="정치4컷 전체 회차">'+moduleActionIconSvg('comic')+'<span class="sr-only">정치4컷 전체 회차</span></button>'+'</div><div class="comic-home-gallery">'+rows.map(p=>link('/political-comic/'+encodeURIComponent(p.id),'<h2 class="comic-home-title"><span>EP.'+issue(p)+'</span> '+esc(p.title)+'</h2><div class="comic-home-picture">'+image(p)+'</div>','comic-home-thumbnail')).join('')+'</div></section>';
}
export function renderComicPage(result={},id=''){
 const list=result.items||[],p=list.find(p=>p.id===id);
 if(id&&!p)return '<section class="comic-page"><h1>회차를 찾을 수 없습니다.</h1>'+link('/political-comic','목록으로 돌아가기')+'</section>';
 if(!id)return '<section class="comic-page comic-library"><nav>'+link('/','← 정참시 메인')+'</nav><header class="comic-page-heading">'+brand+renderShareMenu('/political-comic')+'</header><div class="comic-archive">'+list.map(p=>link('/political-comic/'+encodeURIComponent(p.id),'<div class="comic-cover">'+image(p)+'</div><div><span class="comic-kicker">EP. '+issue(p)+' · '+esc(p.date)+'</span><h2>'+esc(p.title)+'</h2></div>','comic-archive-card')).join('')+'</div></section>';
 const panels=p.panels.map((panel,i)=>'<figure><div class="comic-panel-art comic-panel-'+i+'" role="img" aria-label="'+esc(panel.title+'. '+panel.text)+'"><img src="'+safe(p.image)+'" alt="" loading="lazy" decoding="async"></div></figure>').join('');
 return '<article class="comic-page comic-reader"><nav>'+link('/political-comic','← 전체 회차')+'<span>에피소드 '+issue(p)+'</span></nav><header class="comic-page-heading"><h1>'+esc(p.title)+'</h1><span class="comic-kicker">'+esc(p.date)+'</span>'+renderShareMenu('/political-comic/'+encodeURIComponent(p.id))+'</header><div class="comic-panels comic-manuscript '+(p.format==='comic'?'comic-square':'')+'">'+panels+'</div></article>';

}
export function renderComicAdmin(result={},id=''){
 if(result.ok===false)return '<p role="alert">회차를 불러오지 못했습니다. 새로고침해 주세요.</p>';
 const p=result.items?.find(p=>p.id===id)||{};
 const field=(name,label,value='',required=true)=>'<label>'+label+'<input name="'+name+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>';
 const upload=(key,label,value='')=>'<fieldset class="comic-upload-block"><legend>'+label+'</legend><label class="comic-upload-pick">이미지 선택<input type="file" data-comic-upload="'+key+'" accept="image/jpeg,image/png,image/webp"></label><input type="hidden" name="'+key+'" value="'+esc(value)+'"><img data-comic-preview="'+key+'" src="'+safe(value)+'" alt="'+label+' 미리보기" '+(value?'':'hidden')+'><p>'+(key==='image'?'말풍선·내레이션이 포함된 2×2 완성 만화 한 장. 정사각형 원고를 사용하세요. 권장 1536×1536px.':'선택 항목입니다. 등록하지 않으면 원고를 표지로 사용합니다.')+' JPG·PNG·WebP, 1MB 이하.</p></fieldset>';
 return '<div class="comic-admin"><section class="comic-admin-list"><h2>회차 관리</h2>'+link('/admin/political-comic','＋ 새 회차','comic-button')+(result.items||[]).map(row=>link('/admin/political-comic?id='+encodeURIComponent(row.id),'<b>EP. '+issue(row)+' '+esc(row.title)+'</b><span>'+(row.published?'게시 중':'비공개')+'</span>')).join('')+'</section><form data-comic-editor><header><h2>'+(p.id?'회차 수정':'새 정치4컷')+'</h2><p>완성된 만화 원고를 올리고 게시 정보를 입력하세요.</p></header><input type="hidden" name="format" value="comic"><input type="hidden" name="id" value="'+esc(p.id)+'"><input type="hidden" name="updatedAt" value="'+esc(p.updatedAt)+'"><fieldset><legend>01 · 게시 정보</legend>'+field('title','회차 제목',p.title)+'<label>날짜<input type="date" name="date" required value="'+esc(p.date||new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}))+'"></label></fieldset>'+upload('image','02 · 완성 만화 원고',p.image)+'<fieldset><legend>공개 설정</legend><label class="comic-publish"><input name="published" type="checkbox" '+(p.published?'checked':'')+'> 메인과 회차 목록에 공개</label></fieldset><button class="comic-button" type="submit">저장하기</button><p data-comic-status role="status" aria-live="polite"></p><a data-comic-public-link '+(p.id?'href="/political-comic/'+encodeURIComponent(p.id)+'"':'hidden')+' target="_blank" rel="noopener">공개 회차 보기 ↗</a></form></div>';
}
