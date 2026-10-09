import {readUsers,writeUsers} from './rebuild-store.js';
import {isSuperAdmin} from '../src/core/membership.js';
import {normalizeTaxiEditGrant} from '../src/core/taxi-edit-permissions.js';
export async function setTaxiEditPermission(command,input,actorId,getPerson){
 const users=await readUsers(command),actor=users[actorId],user=users[input.id];
 if(!isSuperAdmin(actor))throw Error('FORBIDDEN');
 if(!user)throw Error('USER_NOT_FOUND');
 if(isSuperAdmin(user))throw Error('OWNER_PERMISSION_FIXED');
 const grant=normalizeTaxiEditGrant(input),people=await Promise.all(grant.personIds.map(getPerson));
 if(people.some(p=>!p))throw Error('INVALID_PERSON');
 const updatedAt=new Date().toISOString(),previous=user.taxiPageEditing||{scope:'off',personIds:[]};
 user.taxiPageEditing={...grant,people:people.map(p=>({id:p.id,name:p.name})),updatedBy:actor.id,updatedAt};
 user.taxiEditAudit=[{updatedBy:actor.id,updatedAt,before:{scope:previous.scope,personIds:previous.personIds},after:grant},...(user.taxiEditAudit||[])].slice(0,30);
 user.updatedAt=updatedAt;
 await writeUsers(command,users);
 return {ok:true,permission:user.taxiPageEditing};
}
