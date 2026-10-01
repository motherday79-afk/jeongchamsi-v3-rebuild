const root=document.querySelector('[data-web-push-settings]');
const errors={LOGIN_REQUIRED:'로그인한 뒤 다시 설정해 주세요.',PUSH_TEST_LIMIT:'테스트 알림은 30초 간격으로 보낼 수 있습니다.',PUSH_NOT_REGISTERED:'이 브라우저의 알림이 해제되어 있습니다. 알림 켜기를 다시 눌러 주세요.',PUSH_SUBSCRIPTION_EXPIRED:'알림 등록이 만료되었습니다. 알림 켜기를 다시 눌러 주세요.',PUSH_SEND_FAILED:'푸시 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',PUSH_SERVER_ERROR:'서버 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',PUSH_INPUT_INVALID:'이 브라우저의 푸시 등록 정보를 확인할 수 없습니다. 최신 삼성인터넷·Chrome·Safari에서 다시 시도해 주세요.'};
async function request(input){const r=await fetch('/api/v3/push/web',{method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',...(input?{headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{})});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'PUSH_SERVER_ERROR');return data;}
function bytes(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
if(root){
 const status=root.querySelector('[data-push-status]'),feedback=root.querySelector('[data-push-result]'),enable=root.querySelector('[data-push-enable]'),test=root.querySelector('[data-push-test]'),disable=root.querySelector('[data-push-disable]'),login=root.querySelector('[data-push-login]');
 const ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const browser=/SamsungBrowser/.test(ua)?'삼성인터넷':ios?'iPhone · '+(standalone?'홈 화면 정참시':'Safari에서 홈 화면에 추가 필요'):/Chrome/.test(ua)?'Chrome':'현재 브라우저';
 root.querySelector('[data-push-browser]').textContent=browser;
 let registration,settings,subscription,enabled=false,busy=false;
 const paint=()=>{enable.disabled=busy||!settings||enabled||Notification.permission==='denied';test.disabled=busy||!enabled;disable.disabled=busy||!subscription;enable.textContent=enabled?'알림 켜짐':'알림 켜기';};
 const say=(text,error=false)=>{feedback.textContent=text;feedback.dataset.error=String(error);};
 const problem=e=>{say(errors[e.message]||(e.name==='NotAllowedError'?'알림을 허용하지 않았습니다. 브라우저·휴대폰의 알림 설정을 확인해 주세요.':'설정을 완료하지 못했습니다. 네트워크와 브라우저 알림 설정을 확인한 뒤 다시 시도해 주세요.'),true);if(e.message==='LOGIN_REQUIRED'){settings=null;login.hidden=false;}};
 async function sync(){
  subscription=await registration.pushManager.getSubscription();enabled=Notification.permission==='granted'&&!!subscription&&(await request({operation:'status',endpoint:subscription.endpoint})).enabled;
  status.textContent=enabled?'알림이 켜져 있습니다. 테스트 알림을 받아보세요.':Notification.permission==='denied'?'이 사이트의 알림이 차단되어 있습니다. 기기·브라우저 설정에서 허용해 주세요.':'아직 알림이 꺼져 있습니다. 아래 버튼으로 허용해 주세요.';paint();
 }
 async function init(){
  if(ios&&!standalone){status.textContent='iPhone은 먼저 Safari에서 홈 화면에 추가해 주세요. 아래 안내를 따라 홈 화면 아이콘으로 다시 열면 알림을 켤 수 있습니다.';return;}
  if(!isSecureContext||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)||/JCSAndroid/.test(ua)){status.textContent='현재 화면에서는 웹 알림을 설정할 수 없습니다. 이 주소를 삼성인터넷·Chrome 또는 Safari에서 직접 열어 주세요.';return;}
  try{settings=await request();registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});registration=await navigator.serviceWorker.ready;await sync();}catch(e){status.textContent='알림 설정을 준비하지 못했습니다.';problem(e);}
 }
 enable.addEventListener('click',async()=>{
  if(busy||!settings)return;busy=true;paint();say('알림 권한을 확인하고 있습니다.');
  try{
   // Request permission directly in the click handler for Safari's user gesture requirement.
   const permission=await Notification.requestPermission();if(permission!=='granted')throw new DOMException('permission','NotAllowedError');
   subscription=await registration.pushManager.getSubscription();
   const desired=bytes(settings.publicKey),current=subscription?.options?.applicationServerKey;
   if(subscription&&current&&Array.from(new Uint8Array(current)).join()!==Array.from(desired).join()){await subscription.unsubscribe();subscription=null;}
   if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:desired});
   await request({operation:'register',subscription:subscription.toJSON()});await sync();say('알림을 켰습니다. 내 기기로 테스트 알림을 보내보세요.');
  }catch(e){problem(e);}finally{busy=false;paint();}
 });
 test.addEventListener('click',async()=>{if(busy||!enabled)return;busy=true;paint();say('테스트 알림을 보내고 있습니다.');try{await request({operation:'test',endpoint:subscription.endpoint});say('발송이 접수되었습니다. 휴대폰 알림창을 내려 ‘정참시 테스트 알림’을 확인해 주세요.');}catch(e){problem(e);if(['PUSH_NOT_REGISTERED','PUSH_SUBSCRIPTION_EXPIRED'].includes(e.message)){enabled=false;await subscription?.unsubscribe();subscription=null;}}finally{busy=false;paint();}});
 disable.addEventListener('click',async()=>{if(busy||!subscription)return;busy=true;paint();try{await request({operation:'disable',endpoint:subscription.endpoint});await subscription.unsubscribe();subscription=null;enabled=false;await sync();say('이 브라우저의 웹 알림을 껐습니다.');}catch(e){problem(e);}finally{busy=false;paint();}});
 void init();
}
