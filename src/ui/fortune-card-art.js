// Both sides use the same category-specific scene.
export function fortuneArtPath(category){return ['money','business','relationship'].includes(category)?'/assets/fortune/'+category+'-'+(category==='money'?'460':'461')+'.webp':'';}
export function fortuneFrontArt(category){const src=fortuneArtPath(category);return src?'<span class="fortune-front-art" data-fortune-art="'+category+'" aria-hidden="true"><img src="'+src+'" alt="" width="480" height="480" loading="lazy" decoding="async"></span>':'';}
