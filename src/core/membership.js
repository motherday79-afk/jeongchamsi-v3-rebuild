export const MEMBERSHIP_TIERS=Object.freeze([
 {value:'member',label:'일반회원'},
 {value:'platinum',label:'플래티넘 회원'},
 {value:'admin',label:'회원관리자'},
 {value:'superadmin',label:'최고관리자'}
]);

// Preserve the established admin role used by inline operating tools. Only the
// exact legacy account "admin" inherits console ownership; other admins become staff.
export function membershipTier(user){
 if(user?.role==='admin')return user.membershipTier==='superadmin'||String(user.id)==='admin'?'superadmin':'admin';
 if(['platinum','partner'].includes(user?.role))return 'platinum';
 return 'member';
}
const active=user=>!!user?.id&&user.status!=='suspended';
export const membershipLabel=user=>MEMBERSHIP_TIERS.find(row=>row.value===membershipTier(user)).label;
export const isSuperAdmin=user=>active(user)&&membershipTier(user)==='superadmin';
export const canWriteEditorial=user=>active(user)&&membershipTier(user)!=='member';
export const canViewAdminAnalysis=canWriteEditorial;
export function membershipFields(tier){
 if(!MEMBERSHIP_TIERS.some(row=>row.value===tier))return null;
 return {role:['admin','superadmin'].includes(tier)?'admin':tier,membershipTier:tier};
}
const INLINE_ADMIN_ENDPOINTS=new Set(['admin/home-cage','admin/participation','admin/home-banner','admin/home-compare','admin/politicians/photo']);
export const canAccessAdminEndpoint=(user,route)=>isSuperAdmin(user)||(active(user)&&membershipTier(user)==='admin'&&INLINE_ADMIN_ENDPOINTS.has(route));
