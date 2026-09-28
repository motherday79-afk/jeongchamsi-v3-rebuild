import {createHash} from 'node:crypto';
import {encodeStored,decodeStored} from './intelligence-repository.js';

// Public article corpus only; short expiry preserves the existing refresh window.
export async function readKeywordCorpus(command,version,load){
 const key='jcsr2:cache:keyword-corpus:'+createHash('sha256').update(version).digest('hex');
 try{const raw=await command(['GET',key]);if(raw){const rows=decodeStored(raw);if(Array.isArray(rows))return rows;}}catch{}
 const rows=await load();
 try{await command(['SETEX',key,'60',encodeStored(rows)]);}catch{}
 return rows;
}
