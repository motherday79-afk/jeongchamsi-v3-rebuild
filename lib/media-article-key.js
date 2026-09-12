import {createHash} from 'node:crypto';
// Article identity without duplicating long feed URLs in every compact input.
export function mediaArticleKey(value){
 try{const url=new URL(String(value||''));if(!['http:','https:'].includes(url.protocol))return '';url.hash='';for(const key of [...url.searchParams.keys()])if(/^(utm_|fbclid$|gclid$)/i.test(key))url.searchParams.delete(key);return createHash('sha256').update(url.href).digest('hex').slice(0,24);}catch{return '';}
}
