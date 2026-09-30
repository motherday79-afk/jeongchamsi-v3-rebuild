export const HOME_BANNER_INTERVAL=60_000;
export const HERO_BANNER_INTERVAL=90_000;
export const HABI_BANNER=Object.freeze({
 id:'habi-halbi-356',designVersion:'upload',placement:'hero',
 url:'/assets/banners/habi-halbi-pc-356.webp',
 mobileUrl:'/assets/banners/habi-halbi-mobile-356.webp',
 tabletUrl:'/assets/banners/habi-halbi-tablet-356.webp',
 targetUrl:'https://habi-halbi-film.vercel.app/',alt:'하비와 할비 · 가까이 다가가면 보인다. · 2027년 8월, 화성에서 만납니다. 감독 박인식'
});
export const VELGARD_BANNER=Object.freeze({
 id:'velgard-355',designVersion:'upload',placement:'sidebar',
 url:'/assets/banners/velgard-pc-355.webp',
 mobileUrl:'/assets/banners/velgard-mobile-355.webp',
 tabletUrl:'/assets/banners/velgard-tablet-355.webp',
 targetUrl:'https://velgard.store',
 alt:'하루, 가장 완벽한 컨설팅이 시작됩니다. 벨가르드'
});
export function homeBannerPlaylist(banner,placement='sidebar'){
 const registered=Array.isArray(banner?.items)?banner.items.filter(item=>item?.url||item?.id==='jcs-default-campaign'):banner?.url?[banner]:[];
 const items=[placement==='hero'?HABI_BANNER:VELGARD_BANNER,...(registered.length?registered:placement==='hero'?[]:[{id:'jcs-default-campaign'}])];
 const seen=new Set();return items.filter(item=>{const id=item.id||item.url||'default-campaign';if(seen.has(id))return false;seen.add(id);return true;});
}
