import {isSuperAdmin} from '../src/core/membership.js';

// A byline belongs to a post. Account identity and ownership never change.
export function validateDisplayAuthor(input,user){
  if(!Object.hasOwn(input,'displayAuthor'))return;
  if(!isSuperAdmin(user))throw Object.assign(new Error('DISPLAY_AUTHOR_FORBIDDEN'),{status:403});
  const value=input.displayAuthor;
  if(typeof value!=='string'||value.trim().length>40||/[\u0000-\u001f\u007f]/.test(value))
    throw Object.assign(new Error('DISPLAY_AUTHOR_INVALID'),{status:400});
}
export function applyDisplayAuthor(post,input,user){
  validateDisplayAuthor(input,user);
  if(!Object.hasOwn(input,'displayAuthor'))return post;
  if(String(post.ownerId)!==String(user.id))throw Object.assign(new Error('DISPLAY_AUTHOR_OWNER_REQUIRED'),{status:403});
  const alias=input.displayAuthor.trim();
  post.author=alias||String(user.nickname||user.id).trim().slice(0,40);
  post.authorAlias=alias;
  return post;
}
