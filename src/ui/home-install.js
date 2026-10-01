export function renderMyDeviceMenu(){const native=Number(/JCSAndroid\/1\.1\.(\d+)/.exec(globalThis.navigator?.userAgent||'')?.[1]||0)>=383;return `<section class="mypage-device-menu" aria-label="내 기기 설정"><div class="mypage-device-heading"><span class="mypage-notification-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span><div><h2>정참시를 더 가까이</h2><p>소식을 받고, 홈 화면에서 바로 시작하세요.</p></div></div><div class="mypage-device-actions"><a href="${native?'jcs-push://settings':'/notifications'}"><strong>알림 설정</strong><span>${native?'휴대폰 앱 알림 설정':'알림 켜기 · 테스트 알림 받기'}</span></a><button type="button" data-home-install><strong>홈 화면에 정참시 추가</strong><span>휴대폰 바탕화면에 바로가기 만들기</span></button></div></section>`;}
export function homeInstallGuide({userAgent='',platform='',maxTouchPoints=0,standalone=false}={}){
 if(standalone)return '<p>이미 홈 화면의 정참시 아이콘으로 실행 중입니다.</p>';
 if(/KAKAOTALK|JCSAndroid|Instagram|FBAN|FBAV/i.test(userAgent))return '<p>현재 앱 안에서는 홈 화면 아이콘을 만들 수 없습니다.</p><ol><li>이 페이지를 <strong>다른 브라우저로 열기</strong>로 이동하세요.</li><li>안드로이드는 삼성인터넷 또는 Chrome, 아이폰은 Safari를 선택하세요.</li><li>마이페이지에서 <strong>홈 화면에 정참시 추가</strong>를 다시 누르세요.</li></ol><p>주소: <strong>www.jeongchamsi.com</strong></p>';
 if(/iPhone|iPad|iPod/.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1))return '<p>아이폰에서는 Safari의 공유 메뉴에서 직접 추가합니다.</p><ol><li>Safari의 <strong>공유 버튼</strong>을 누르세요. 보이지 않으면 메뉴(···) 안을 확인하세요.</li><li><strong>홈 화면에 추가</strong>를 선택하세요.</li><li>이름을 정참시로 두고 <strong>추가</strong>를 누르세요. ‘웹 앱으로 열기’가 있으면 켜주세요.</li><li>휴대폰 홈 화면의 <strong>정참시 아이콘</strong>으로 접속하세요.</li></ol><p>‘홈 화면에 추가’가 없다면 공유 메뉴의 동작 편집에서 추가해 주세요.</p>';
 if(/SamsungBrowser/.test(userAgent))return '<ol><li>삼성인터넷의 <strong>메뉴(☰)</strong>를 누르세요.</li><li><strong>현재 페이지 추가 → 홈 화면</strong>을 선택하세요. 버전에 따라 ‘홈 화면에 추가’ 또는 ‘앱 설치’로 표시됩니다.</li><li><strong>추가</strong>를 눌러 정참시 아이콘을 만드세요.</li></ol>';
 if(/Android/.test(userAgent))return '<ol><li>Chrome 오른쪽 위 <strong>메뉴(⋮)</strong>를 누르세요.</li><li><strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong>를 선택하세요.</li><li><strong>설치</strong> 또는 <strong>추가</strong>를 누르면 휴대폰 홈 화면에서 정참시를 열 수 있습니다.</li></ol>';
 return '<p>PC에서는 Chrome 또는 Edge 주소창의 설치 아이콘이나 브라우저 메뉴의 <strong>앱 설치</strong>를 이용할 수 있습니다.</p><p>휴대폰에 아이콘을 만들려면 휴대폰에서 정참시를 열고 이 버튼을 눌러 주세요.</p>';
}
export function bindHomeInstall(root=document){
 let prompt=null,installed=false;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;});
 window.addEventListener('appinstalled',()=>{installed=true;prompt=null;});
 if(globalThis.isSecureContext&&globalThis.navigator?.serviceWorker)void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
 function guide(trigger,message=''){
  const dialog=document.createElement('dialog');dialog.className='home-install-dialog';dialog.setAttribute('aria-labelledby','home-install-title');
  const copy=message?`<p>${message}</p>`:homeInstallGuide({userAgent:navigator.userAgent,platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints,standalone:installed||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true});
  dialog.innerHTML=`<h2 id="home-install-title">홈 화면에 정참시 추가</h2>${copy}<form method="dialog"><button>확인</button></form>`;
  document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(trigger.isConnected)trigger.focus();},{once:true});dialog.showModal();
 }
 root.addEventListener('click',async e=>{
  const button=e.target.closest('[data-home-install]');if(!button||button.disabled)return;
  if(prompt){const event=prompt;prompt=null;button.disabled=true;try{const choice=await event.prompt();if(choice?.outcome==='accepted')guide(button,'설치 요청을 완료했습니다. 아이콘 생성은 기기에서 확인해 주세요.');}catch{guide(button);}finally{button.disabled=false;}}
  else guide(button);
 });
}
