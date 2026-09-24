export function makeIdleNotice(){
 let since=null;
 return ({now,visible,running,full,ready})=>{
  if(!visible||running||full||!ready){since=null;return '';}
  if(since===null)since=now;
  return now-since>=60000?'채굴이 멈춰 있어요. 자동채굴하기를 눌러 광물을 모아보세요.':'';
 };
}
export function setText(el,value){if(el&&el.textContent!==value)el.textContent=value;}
