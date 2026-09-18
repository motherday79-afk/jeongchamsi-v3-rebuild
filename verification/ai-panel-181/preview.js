import {createAiPanelClient} from '/src/core/ai-panel-client.js';
import {loadAiPanelPage} from '/src/core/ai-panel-routing.js';
import {bindAiPanelInteractions} from '/src/ui/ai-panel-interactions.js';
import {renderHomeLayout} from '/src/layout/home-layout.js';
import {HOME_FIXTURE} from '/src/fixtures/home.js';
const client=createAiPanelClient(),app=document.querySelector('#app');
async function render(){const params=new URLSearchParams(location.search);app.innerHTML='<p>불러오는 중…</p>';const body=location.pathname==='/'?renderHomeLayout({...HOME_FIXTURE,aiPanelResult:await client.list()}):await loadAiPanelPage({admin:location.pathname.startsWith('/admin'),params,session:{authenticated:true,user:{id:'local-qa',role:'admin',status:'active'}},client});app.innerHTML='<div style="padding:12px;background:#fff3cb">LOCAL QA ONLY · 가상 자료 · 운영 저장소와 연결되지 않음 · <a href="/">메인</a> / <a href="/admin/ai-panel">검증 관리자</a></div><div class="page-wrap">'+body+'</div>';}
function navigate(route){history.pushState(null,'',route);void render();}
document.addEventListener('click',e=>{const link=e.target.closest('[data-layout-route]');if(link){e.preventDefault();navigate(link.dataset.layoutRoute);}});
bindAiPanelInteractions(document,{client,navigate,onSaved:(r,op)=>navigate(op==='panel-create'?'/admin/ai-panel?tab=panels':'/admin/ai-panel?id='+r.item.id)});
window.addEventListener('popstate',render);void render();
