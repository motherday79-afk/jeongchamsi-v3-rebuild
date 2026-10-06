// Editorial card illustrations share the bright homepage image direction.
export function fortuneFrontArt(category){
 if(!['money','business','relationship'].includes(category))return '';
 return '<span class="fortune-front-art" data-fortune-art="'+category+'" aria-hidden="true"><img src="/assets/fortune/'+category+'-460.webp" alt="" width="480" height="480" loading="lazy" decoding="async"></span>';
}
