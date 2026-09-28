import {createHmac} from 'node:crypto';
export const CAFE24_STORAGE_URL='https://terry2525.cafe24.com/redis';
export const STORAGE_PHASE='maintenance';
// Domain-separated server-only credential; the original secret never leaves Vercel.
export function cafe24Token(sourceUrl){
 if(!sourceUrl)throw new Error('STORAGE_MISSING');
 return createHmac('sha256',String(sourceUrl).trim()).update('jcs-cafe24-storage-v1').digest('hex');
}
