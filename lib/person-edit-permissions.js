import {readUsers,writeUsers} from './rebuild-store.js';
import {isSuperAdmin} from '../src/core/membership.js';
import {normalizePersonEditGrant} from '../src/core/person-edit-permissions.js';
export async function setPersonEditPermission(command,input,actorId,getPerson){
 const users=await readUsers(command),actor=users[actorId],user=users[input.id];
 if(!isSuperAdmin(actor))throw Error('FORBIDDEN');
 if(!user)throw Error('USER_NOT_FOUND');
 if(isSuperAdmin(user))throw Error('OWNER_PERMISSION_FIXED');
 const grant=normalizePersonEditGrant(input),people=await Promise.all(grant.personIds.map(getPerson));
 if(people.some(p=>!p))throw Error('INVALID_PERSON');
 const updatedAt=new Date().toISOString(),previous=user.personPageEditing||{scope:'off',personIds:[]};
 user.personPageEditing={...grant,people:people.map(p=>({id:p.id,name:p.name})),updatedBy:actor.id,updatedAt};
 user.personEditAudit=[{updatedBy:actor.id,updatedAt,before:{scope:previous.scope,personIds:previous.personIds},after:grant},...(user.personEditAudit||[])].slice(0,30);
 user.updatedAt=updatedAt;
 await writeUsers(command,users);
 return {ok:true,permission:user.personPageEditing};
}
