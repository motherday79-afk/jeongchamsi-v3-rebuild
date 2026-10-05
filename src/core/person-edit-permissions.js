import {isSuperAdmin} from './membership.js?v=0.0.31.354';
export function canEditPersonPage(user,personId){
 if(!user?.id||user.status==='suspended'||!personId)return false;
 if(isSuperAdmin(user))return true;
 const grant=user.personPageEditing;
 return grant?.scope==='all'||(grant?.scope==='selected'&&Array.isArray(grant.personIds)&&grant.personIds.includes(personId));
}
export function normalizePersonEditGrant(input={}){
 if(!['off','all','selected'].includes(input.scope))throw Error('INVALID_SCOPE');
 const personIds=input.scope==='selected'?[...new Set(Array.isArray(input.personIds)?input.personIds:[])]:[];
 if(input.scope==='selected'&&(!personIds.length||personIds.length>700||personIds.some(id=>typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id))))throw Error('INVALID_PERSON_IDS');
 return {scope:input.scope,personIds};
}
