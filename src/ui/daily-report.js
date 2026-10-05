import {renderDailyReportBody,renderReportComparison} from '../views/daily-report.js?v=0.0.31.445';
export function bindDailyReports(root=document){
 if(root.__dailyReportsBound)return;root.__dailyReportsBound=true;
 async function load(widget,period='24H',date=''){
  widget._currentHtml??=widget.querySelector('[data-dr-body]').innerHTML;
  const token=(widget._request||0)+1;widget._request=token;
  const status=widget.querySelector('[data-dr-status]');status.textContent='기록을 불러오고 있습니다…';
  try{
   const response=await fetch('/api/v3/politicians?id='+encodeURIComponent(widget.dataset.dailyReport)+'&reportHistory=1'+(date?'&reportDate='+encodeURIComponent(date):''),{credentials:'same-origin',cache:'no-store'});
   const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'FAILED');if(!widget.isConnected||widget._request!==token)return;
   if(!data.selected){status.textContent='해당 날짜에 저장된 보고서가 없습니다.';return;}
   const body=widget.querySelector('[data-dr-body]');
   if(widget._date!==date){body.innerHTML=date?renderDailyReportBody(data.selected):widget._currentHtml;widget._date=date;}
   body.querySelector('[data-dr-comparison]').innerHTML=renderReportComparison(data.comparisons[period]);
   body.querySelectorAll('[data-dr-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.drPeriod===period)));
   widget._period=period;status.textContent=date?'저장된 기록 · '+date:'최신 자료 · 일별 기록 '+data.dates.length+'일';
  }catch{if(widget._request===token)status.textContent='기록을 불러오지 못했습니다. 기간 버튼을 눌러 다시 시도해 주세요.';}
 }
 root.addEventListener('click',e=>{const button=e.target.closest('[data-dr-period],[data-dr-current]');if(!button)return;const widget=button.closest('[data-daily-report]');if(!widget)return;
  if(button.hasAttribute('data-dr-current')){widget.querySelector('[data-dr-date]').value='';void load(widget,'24H','');}
  else void load(widget,button.dataset.drPeriod,widget._date||'');
 });
 root.addEventListener('change',e=>{if(!e.target.matches('[data-dr-date]'))return;const widget=e.target.closest('[data-daily-report]');if(widget)void load(widget,'24H',e.target.value);});
}
