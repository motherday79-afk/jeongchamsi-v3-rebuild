export function formatDistance(value){const meters=Math.max(0,Number(value)||0);return meters>=1000?{value:(meters/1000).toFixed(1),unit:'KM'}:{value:String(Math.floor(meters)),unit:'M'};}
