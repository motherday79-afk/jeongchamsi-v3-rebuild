// Concept products: no prices, specifications or checkout until confirmed.
export const APPAREL_PRODUCTS=[
 {id:'jcs-sweatshirt',key:'sweatshirt',name:'정참시 맨투맨',tag:'SWEATSHIRT',story:'편안함 속에 담은 존재감.',description:'블랙 바탕에 퍼플 숄더 라인과 작은 골드 심볼을 더했습니다. 데님에도, 같은 컬러의 팬츠에도 자연스럽게 어울리는 맨투맨 디자인입니다.',features:['퍼플 숄더 포인트','골드 JCS 심볼','블랙 라운드넥']},
 {id:'jcs-pants',key:'pants',name:'정참시 팬츠',tag:'PANTS',story:'내일을 향한 당당한 걸음.',description:'옆선을 따라 내려오는 퍼플 배색과 가는 골드 라인. 편안한 일상복에 정참시의 색을 담은 조거 팬츠 디자인입니다.',features:['퍼플 사이드 라인','골드 스트링 포인트','조거 실루엣']},
 {id:'jcs-hoodie',key:'hoodie',name:'정참시 후디',tag:'HOODIE',story:'나의 생각을 입다.',description:'블랙 몸판과 퍼플 소매, 후드 안쪽까지 이어지는 배색이 특징입니다. 앞면의 포켓과 골드 심볼로 포인트를 완성했습니다.',features:['퍼플 소매와 후드 안감','앞면 캥거루 포켓','골드 JCS 심볼']},
 {id:'jcs-shorts',key:'shorts',name:'정참시 쇼츠',tag:'SHORTS',story:'가볍게 움직여, 더 넓은 세상으로.',description:'블랙 쇼츠의 양옆에 퍼플 패널과 골드 테두리를 둘렀습니다. 산책이나 야외 모임에서 가볍게 입는 모습을 떠올린 디자인입니다.',features:['퍼플 사이드 패널','얇은 골드 파이핑','드로스트링 디테일']},
 {id:'jcs-tshirt',key:'tshirt',name:'정참시 티셔츠',tag:'T-SHIRT',story:'일상에 입는 나의 목소리.',description:'블랙 티셔츠 위에 퍼플 배색과 얇은 골드 선을 담았습니다. 단독으로도, 후디 안에 함께 입어도 잘 어울리는 기본 아이템입니다.',features:['블랙 라운드넥','퍼플 사이드 배색','골드 라인과 심볼']},
 {id:'jcs-sneakers',key:'sneakers',name:'정참시 스니커즈',tag:'SNEAKERS',story:'세상을 바꾸는 첫걸음.',description:'퍼플과 블랙의 조합에 골드 힐 포인트, 아이보리 솔을 더했습니다. 정참시의 색을 발끝까지 이어가는 스니커즈 디자인입니다.',features:['퍼플·블랙 컬러 조합','골드 심볼과 힐 포인트','아이보리 솔 디자인']}
];
const root='/assets/shop/apparel-297/';
const sizes={sweatshirt:[1024,782,754],pants:[1024,758,778],hoodie:[1024,826,710],shorts:[941,861,811],tshirt:[941,890,782],sneakers:[941,879,793]};
const route=p=>'/shop/'+p.id;
const card=p=>`<a class="apparel-card" href="${route(p)}" data-layout-route="${route(p)}"><img src="${root}${p.key}-banner.jpg" alt="${p.name} 디자인" width="800" height="450" loading="lazy" decoding="async"><div><span>${p.tag}</span><h3>${p.name}</h3><p>${p.story}</p><b>디자인 살펴보기 <span aria-hidden="true">↗</span></b></div></a>`;
export function renderApparelCatalog(){return `<section class="module catalog-section apparel-catalog" id="jcs-wear"><header><span class="catalog-number">04</span><div><span class="eyebrow">JCS WEAR</span><h2>일상에서, 함께하는 자리까지.</h2></div><small>6 ITEMS</small></header><p class="apparel-intro">정참시의 퍼플과 골드를 담은 의류와 스니커즈.</p><span class="apparel-example">예시 상품 · 판매 전 디자인</span><div class="apparel-grid">${APPAREL_PRODUCTS.map(card).join('')}</div></section>`;}
export function renderApparelProduct(id){
 const p=APPAREL_PRODUCTS.find(item=>item.id===id);if(!p)return null;
 return `<section class="apparel-detail"><nav class="cheer-breadcrumb" aria-label="현재 위치"><a href="/" data-layout-route="/">홈</a><span> / </span><a href="/shop" data-layout-route="/shop">쇼핑몰</a><span> / ${p.name}</span></nav>
 <header class="apparel-heading"><span class="eyebrow">JEONGCHAMSI · ${p.tag}</span><h1>${p.name}</h1><span class="apparel-example">예시 상품</span></header>
 <img class="apparel-banner" src="${root}${p.key}-banner.jpg" alt="${p.name} — ${p.story}" width="800" height="450" fetchpriority="high">
 <div class="apparel-overview"><div><h2>${p.story}</h2><p>${p.description}</p></div><ul>${p.features.map(f=>`<li>${f}</li>`).join('')}</ul></div>
 <section class="apparel-editorial"><header><span class="eyebrow">EVERYDAY FIT</span><h2>각자의 스타일로 입는 정참시.</h2><p>남녀 착용 모습을 통해 전체적인 핏과 배색을 살펴보세요.</p></header><img src="${root}${p.key}-fit.webp" alt="성인 남녀 모델의 ${p.name} 착용 연출" width="${sizes[p.key][0]}" height="${sizes[p.key][1]}" loading="lazy" decoding="async"></section>
 <section class="apparel-editorial"><header><span class="eyebrow">TOGETHER, OUTSIDE</span><h2>함께 걷고, 함께하는 순간.</h2><p>친구들과의 야외 모임부터 광장에서 함께하는 시간까지.</p></header><img src="${root}${p.key}-scene.webp" alt="${p.name}을 착용하고 평화로운 광장 모임에 함께하는 가상 장면" width="${sizes[p.key][0]}" height="${sizes[p.key][2]}" loading="lazy" decoding="async"></section>
 <p class="apparel-image-note">착용·현장 사진은 AI로 제작한 연출 이미지입니다. 실제 상품이나 행사 촬영 사진이 아닙니다.</p>
 <section class="apparel-info module"><h2>상품 안내</h2><dl><div><dt>상품명</dt><dd>${p.name}</dd></div><div><dt>디자인 컬러</dt><dd>블랙 · 퍼플 · 골드${p.key==='sneakers'?' · 아이보리':''}</dd></div><div><dt>가격·사이즈·소재</dt><dd>출시 시 안내 예정</dd></div><div><dt>판매 상태</dt><dd>예시 상품 · 현재 구매할 수 없습니다</dd></div></dl><div class="apparel-actions"><a class="primary-btn" href="/shop/request?item=${p.id}" data-layout-route="/shop/request?item=${p.id}">이 디자인으로 제작 문의</a><a class="cheer-back" href="/shop" data-layout-route="/shop">전체 상품 보기</a></div></section>
 <section class="apparel-related"><span class="eyebrow">JCS WEAR</span><h2>함께 살펴보세요</h2><div class="apparel-grid">${APPAREL_PRODUCTS.filter(item=>item.id!==id).map(card).join('')}</div></section></section>`;
}
