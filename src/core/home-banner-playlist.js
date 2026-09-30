export const HOME_BANNER_INTERVAL=60_000;
export const VELGARD_BANNER=Object.freeze({
 id:'velgard-355',designVersion:'upload',placement:'sidebar',
 url:'/assets/banners/velgard-pc-355.webp',
 mobileUrl:'/assets/banners/velgard-mobile-355.webp',
 tabletUrl:'/assets/banners/velgard-tablet-355.webp',
 targetUrl:'https://velgard.store',
 alt:'하루, 가장 완벽한 컨설팅이 시작됩니다. 벨가르드'
});
export function homeBannerPlaylist(banner){
 const registered=Array.isArray(banner?.items)?banner.items.filter(item=>item?.url||item?.id==='jcs-default-campaign'):banner?.url?[banner]:[];
 const items=[VELGARD_BANNER,...(registered.length?registered:[{id:'jcs-default-campaign'}])];
 const seen=new Set();return items.filter(item=>{const id=item.id||item.url||'default-campaign';if(seen.has(id))return false;seen.add(id);return true;});
}
