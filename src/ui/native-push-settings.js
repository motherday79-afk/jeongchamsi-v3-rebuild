export function configureNativePushSettings(root,userAgent=''){
 if(!/JCSAndroid\//i.test(userAgent))return false;
 const supported=Number(/JCSAndroid\/1\.1\.(\d+)/i.exec(userAgent)?.[1]||0)>=345;
 root.querySelector('.push-card-heading h2').textContent='이 기기의 앱 알림';
 root.querySelector('[data-push-browser]').textContent='정참시 안드로이드 앱';
 root.querySelector('[data-push-status]').textContent=supported?'아래 버튼에서 앱 알림을 켜거나 끌 수 있습니다.':'앱 알림을 지원하는 최신 정참시 앱으로 업데이트해 주세요.';
 root.querySelector('.push-actions').innerHTML=supported?'<a class="push-login" href="jcs-push://settings">앱 알림 켜기·끄기</a>':'';
 root.querySelector('.push-controls .push-note').textContent='버튼을 누르면 앱의 알림 설정창이 열립니다. 로그인한 뒤 알림 켜기를 선택해 주세요. 관리자는 나우랭크·여론조사 갱신 알림도 받을 수 있습니다.';
 root.querySelector('.push-guide').hidden=true;
 root.querySelector('.push-troubleshooting').innerHTML='<h2>앱 알림이 보이지 않을 때</h2><p>휴대폰 설정 → 알림 → 정참시에서 알림을 허용해 주세요. 앱에 로그인한 뒤 위 버튼에서 알림을 다시 켜 주세요.</p>';
 return true;
}
