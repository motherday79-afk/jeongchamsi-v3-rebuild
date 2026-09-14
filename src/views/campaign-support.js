import { campaignUrl } from '../core/campaign-model.js?v=0.0.31.159';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const won=value=>Number.isSafeInteger(value)?`${value.toLocaleString('ko-KR')}원`:'';
const validFunding=funding=>funding&&typeof funding==='object'&&(funding.demo===true||funding.public!==false);

export function renderCampaignProgress({funding,compact=false}={}){
 if(!validFunding(funding))return '';
 const raised=won(funding.raisedKrw),goal=won(funding.goalKrw),count=Number.isSafeInteger(funding.supporterCount)?`${funding.supporterCount.toLocaleString('ko-KR')}명`:'';
 if(!raised&&!goal&&!count)return '';
 const percent=Number.isSafeInteger(funding.raisedKrw)&&Number.isSafeInteger(funding.goalKrw)&&funding.goalKrw>0?Math.floor(funding.raisedKrw/funding.goalKrw*100):null,meter=percent===null?null:Math.min(100,percent);
 const label=funding.demo===true?'DEMO 모금 현황':'공개된 모금 현황';
 if(compact)return `<p class="campaign-progress-compact">${funding.demo===true?'<b>DEMO</b> ':''}${raised?`${raised} 모금`:count?`${count} 참여`:goal?`목표 ${goal}`:''}${goal&&raised?` · 목표 ${goal}${percent===null?'':` · ${percent}%`}`:''}</p>`;
 return `<div class="campaign-progress${funding.demo===true?' is-demo':''}"><div class="campaign-progress-head"><b>${label}</b>${funding.asOf?`<span>${esc(funding.asOf)} 기준</span>`:''}</div><div class="campaign-progress-values">${raised?`<strong>${raised}</strong>`:''}${goal?`<span>목표 ${goal}</span>`:''}${percent!==null?`<b>${percent}%</b>`:''}</div>${meter!==null?`<div class="campaign-progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${meter}" aria-label="모금 달성률"><i style="--campaign-progress:${meter}%"></i></div>`:''}${count?`<p>${count}이 함께했습니다.</p>`:''}</div>`;
}

export function renderCampaignSupport(item={}){
 const support=item.support, funding=item.funding, demo=item.isExample===true||support?.demo===true||funding?.demo===true, archive=item.state==='archive';
 const progress=renderCampaignProgress({funding});
 if(demo)return `<section class="jcs-support campaign-support is-demo" id="jcs-campaign-support" aria-label="예시 후원 안내"><div class="jcs-kicker">SUPPORT · DEMO</div><h2>이 제안에 공감하셨나요?</h2><p class="campaign-demo-warning">화면 설명을 위한 허구의 DEMO입니다. 실제로 송금하거나 후원할 수 없습니다.</p><div class="campaign-recipient"><span>수령인 · 단체</span><strong>${esc(support?.recipientName||'DEMO 수령 단체')}</strong></div><div class="campaign-account"><span>${esc(support?.bankName||'예시은행')}</span><strong>${esc(support?.accountNumber||'예시-계좌번호')}</strong><small>예금주 ${esc(support?.accountHolder||'인물명(예시)')}</small><button type="button" disabled>복사 불가</button></div>${progress}<div class="campaign-support-actions"><button type="button" disabled>후원하기 · 사용 불가</button><button type="button" disabled>QR · 사용 불가</button></div></section>`;
 const verified=support?.public===true&&support?.verified===true&&campaignUrl(support.sourceUrl)&&(campaignUrl(support.officialUrl)||support.accountNumber)&&(support.recipientName||support.associationName);if(archive&&!progress)return '';
 if(!verified&&!progress)return '';
 const recipient=support?.recipientName||support?.associationName||'',source=campaignUrl(support?.sourceUrl),official=campaignUrl(support?.officialUrl),qr=campaignUrl(support?.qrImageUrl);
 const account=!archive&&support?.accountNumber?`<div class="campaign-account"><span>${esc(support.bankName)}</span><strong>${esc(support.accountNumber)}</strong>${support.accountHolder?`<small>예금주 ${esc(support.accountHolder)}</small>`:''}<button type="button" data-campaign-copy-account="${esc(support.accountNumber)}">계좌 복사</button></div>`:'';
 const actions=!archive?`<div class="campaign-support-actions">${official?`<a href="${esc(official)}" target="_blank" rel="noopener noreferrer">수령인 공식 안내에서 후원하기</a>`:''}${qr?`<a href="${esc(qr)}" target="_blank" rel="noopener noreferrer">수령인 QR 안내 보기</a>`:''}</div>`:'';
 return `<section class="jcs-support campaign-support${archive?' is-archive':''}" id="jcs-campaign-support" aria-label="캠페인 후원 안내"><div class="jcs-kicker">SUPPORT THE POSSIBILITY</div><h2>${archive?'당시 공개된 모금 기록':'이 제안에 공감하셨나요?'}</h2>${verified?`<div class="campaign-recipient"><span>수령인 · 단체</span><strong>${esc(recipient)}</strong>${source?`<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">확인된 정보 출처</a>`:''}</div>${account}${!archive&&support.instructions?`<p class="campaign-support-instructions">${esc(support.instructions)}</p>`:''}${actions}`:''}${progress}${funding?.sourceUrl&&campaignUrl(funding.sourceUrl)?`<a class="campaign-funding-source" href="${esc(campaignUrl(funding.sourceUrl))}" target="_blank" rel="noopener noreferrer">보고된 모금 현황 출처</a>`:''}<p class="jcs-direct-note">정참시는 결제를 처리하지 않으며, 공개된 수령인 정보를 확인해 직접 결정합니다.</p></section>`;
}
