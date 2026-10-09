// Category seals have a portrait back and an opened, compact front.
export function fortuneArtPath(category,side='back'){return ['money','business','relationship'].includes(category)?'/assets/fortune/'+category+'-'+(side==='front'?'front':'back')+'-484.svg':'';}
export function fortuneFrontArt(category){const src=fortuneArtPath(category,'front');return src?'<span class="fortune-front-art" data-fortune-art="'+category+'" aria-hidden="true"><img src="'+src+'" alt="" width="240" height="220" loading="lazy" decoding="async"></span>':'';}
