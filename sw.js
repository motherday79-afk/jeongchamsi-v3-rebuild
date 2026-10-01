// Push only: intentionally no fetch handler or offline cache for authenticated pages.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 let path='/notifications';try{const u=new URL(payload.path||path,self.location.origin);if(u.origin===self.location.origin&&!/^\/api\//.test(u.pathname))path=u.pathname+u.search+u.hash;}catch{}
 // Every received push is visible, including malformed/empty payloads (Safari requirement).
 event.waitUntil(self.registration.showNotification(String(payload.title||'정참시 새 소식').slice(0,100),{
  body:String(payload.body||'정참시에 새로운 소식이 도착했습니다.').slice(0,350),icon:'/assets/brand/jcs-push-192.png',
  tag:String(payload.eventId||'jcs-message').slice(0,100),data:{path},renotify:false
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const url=new URL(event.notification.data?.path||'/notifications',self.location.origin);
  if(url.origin!==self.location.origin)return;
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients){if(new URL(client.url).origin===self.location.origin){await client.navigate(url.href);await client.focus();return;}}
  await self.clients.openWindow(url.href);
 })());
});
