export const canAccessTaxi=user=>!user?.id||!user.status||user.status==='active';
