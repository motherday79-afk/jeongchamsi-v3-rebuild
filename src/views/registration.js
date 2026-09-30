import {regionProvinceOptions,regionLocalityOptions} from '../data/korean-regions.js?v=0.0.31.351';

const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const options=(rows,selected,placeholder)=>`<option value="">${placeholder}</option>${rows.map(value=>`<option value="${esc(value)}"${value===selected?' selected':''}>${esc(value)}</option>`).join('')}`;

export function addressFields(user={}){
  const province=user.regionProvince||'',locality=[user.regionCity,user.regionDistrict].filter(Boolean).join(' ');
  return `<label class="form-field"><span>시·도</span><select name="regionProvince" data-region-province required>${options(regionProvinceOptions(),province,'시·도 선택')}</select></label>
  <label class="form-field"><span>시·군·구</span><select name="regionLocality" data-region-locality required${province?'':' disabled'}>${options(regionLocalityOptions(province),locality,province?'시·군·구 선택':'시·도를 먼저 선택해 주세요')}</select></label>`;
}

const input=(name,label,attributes,hint='')=>`<label class="form-field"><span>${label}</span><input name="${name}" ${attributes} required${hint?` aria-describedby="join-${name}-hint"`:''}>${hint?`<small id="join-${name}-hint">${hint}</small>`:''}</label>`;

export function renderJoin(){
  return `<section class="join-page" aria-labelledby="join-title">
    <aside class="join-welcome">
      <span class="join-wordmark">JEONGCHAMSI</span>
      <div><span class="join-kicker">정치에 참여할 시간</span><h1 id="join-title">당신의 관심이<br>가장 큰 자산 입니다.</h1><p>여.야.중도 모두가 한자리에서<br>의견을 나누고 소통 할 수 있어야 합니다.</p></div>
      <div class="join-welcome-footer"><span>이미 함께하고 계신가요?</span><a href="/login" data-layout-route="/login">로그인 <span aria-hidden="true">↗</span></a></div>
    </aside>
    <form class="stage-form join-required-form" data-stage-form="join">
      <header class="join-form-header"><span class="join-kicker">WELCOME TO JCS</span><h2>회원가입</h2><p>가입에 필요한 정보를 입력해 주세요.</p></header>
      <fieldset class="join-section"><legend><span>01</span> 계정 만들기</legend><div class="join-fields">
        ${input('id','아이디','type="text" autocomplete="username" minlength="4" maxlength="24" pattern="[a-zA-Z0-9._\\-]{4,24}" placeholder="사용할 아이디"','영문·숫자·마침표·밑줄·하이픈, 4~24자')}
        ${input('password','비밀번호','type="password" autocomplete="new-password" minlength="8" placeholder="8자 이상 입력"','8자 이상으로 입력해 주세요.')}
        ${input('nickname','닉네임','type="text" autocomplete="nickname" maxlength="40" placeholder="다른 회원에게 보일 이름"')}
      </div></fieldset>
      <fieldset class="join-section"><legend><span>02</span> 기본 정보</legend><div class="join-fields">
        ${input('name','이름','type="text" autocomplete="name" maxlength="40" placeholder="이름 입력"')}
        ${input('birthYear','출생연도',`type="number" min="1900" max="${new Date().getFullYear()}" inputmode="numeric" autocomplete="bday-year" placeholder="예: 1990"`)}
        ${input('email','이메일','type="email" autocomplete="email" placeholder="name@example.com"')}
        <label class="form-field"><span>휴대전화번호</span><span class="phone-entry"><span data-phone-prefix>010</span><input name="phoneDigits" type="text" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" placeholder="뒷번호 8자리" required aria-label="휴대전화번호 뒷번호 8자리"></span></label>
      </div></fieldset>
      <fieldset class="join-section"><legend><span>03</span> 활동 지역</legend><p class="join-section-note">거주하는 지역을 선택해 주세요.</p><div class="join-fields">${addressFields()}</div></fieldset>
      <div class="join-referral"><label class="form-field"><span>추천인 코드 <em>선택</em></span><input name="referrerCode" inputmode="numeric" placeholder="추천인 숫자 코드"></label></div>
      <footer class="join-form-footer"><p>추천인 코드를 제외한 항목은 모두 필수입니다.</p><button class="primary-btn" type="submit">정참시 시작하기 <span aria-hidden="true">→</span></button><span data-form-state role="status" aria-live="polite"></span><a href="/privacy" data-layout-route="/privacy">개인정보처리방침</a></footer>
    </form>
  </section>`;
}
