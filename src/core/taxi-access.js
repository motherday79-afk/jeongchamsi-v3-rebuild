import {membershipTier} from './membership.js';
export const canAccessTaxi=user=>!!user?.id&&user.status==='active'&&['admin','superadmin'].includes(membershipTier(user));
