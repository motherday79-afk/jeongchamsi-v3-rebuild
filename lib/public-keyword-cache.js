import {createHash} from 'node:crypto';
import {politicalKeywords} from './operational-ranking.js';

// One public calculation per process. Read current inputs on every request:
// article edits, publication dates, moderation rules and names all invalidate it.
export function createPublicKeywordCache(calculate=politicalKeywords){
 let previous;
 return (articles,rules,referenceAt,names)=>{
  const key=createHash('sha256').update(JSON.stringify([articles,rules,referenceAt,names])).digest('hex');
  if(previous?.key===key)return previous.value;
  const value=calculate(articles,rules,referenceAt,names);
  previous={key,value};
  return value;
 };
}
export const cachedPublicKeywords=createPublicKeywordCache();
