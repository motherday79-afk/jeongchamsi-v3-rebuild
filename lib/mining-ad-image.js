import {put} from '@vercel/blob';
import {validatePoliticianPhoto,politicianPhotoStorageStatus} from './politician-photo-service.js';
export async function uploadMineAdImage(input){
 if(String(input.base64||'').length>1400000)throw Error('MINE_IMAGE_TOO_LARGE');
 let valid;try{valid=validatePoliticianPhoto({contentType:input.contentType,bytes:Buffer.from(String(input.base64||''),'base64')});}catch{throw Error('MINE_IMAGE_INVALID');}
 if(!politicianPhotoStorageStatus().configured)throw Error('MINE_IMAGE_STORAGE');
 try{const blob=await put(`mine-ad/${Date.now()}.${valid.extension}`,valid.bytes,{access:'public',contentType:valid.contentType,addRandomSuffix:true});return {ok:true,url:blob.url};}catch{throw Error('MINE_IMAGE_STORAGE');}
}
