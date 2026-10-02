// Browser sessions and installed-app opt-ins are independent. Signing out on
// the web must not remove the phone's update or group notification registration.
export async function revokeLogoutPush(req,userId,nativePush,groupPush){
 const native=/JCSAndroid\/\d+\.\d+\.\d+/.test(String(req.headers?.['user-agent']||''));
 if(native)await nativePush.revoke(userId);
 await groupPush.revoke(userId,{kind:native?'native':'web'});
}
