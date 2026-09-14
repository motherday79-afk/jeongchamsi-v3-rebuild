export function snapshotDocument(doc) {
 const root=doc.documentElement.cloneNode(true);
 const clean=node=>{
  for(const e of node.querySelectorAll('script,iframe,object,embed,[data-jcs-check-host],meta[http-equiv="refresh" i]'))e.remove();
  for(const e of [...(node.nodeType===1?[node]:[]),...node.querySelectorAll('*')]){
   for(const a of [...e.attributes]){
    if(/^on/i.test(a.name))e.removeAttribute(a.name);
    if(['href','xlink:href','src','action','formaction'].includes(a.name)&&/^javascript:/i.test(a.value.replace(/[\x00-\x20]/g,'')))e.removeAttribute(a.name);
   }
   if(e.localName==='input')e.removeAttribute('value');
   if(e.localName==='textarea')e.textContent='';
   if(e.localName==='template')clean(e.content);
  }
 };
 clean(root);
 return '<!doctype html>\n'+root.outerHTML;
}
export function removePresentation(doc) {
 for(const e of doc.querySelectorAll('style,link[rel~="stylesheet"]'))e.remove();
 for(const e of doc.querySelectorAll('[style]')){
  if(!e.hasAttribute('data-jcs-check-host'))e.removeAttribute('style');
 }
}
export function safeUrl(value, base) {
 try{
  const url=new URL(String(value||''),base);
  if(url.protocol==='mailto:')return 'mailto:[address]';
  if(url.protocol==='tel:')return 'tel:[number]';
  if(!['https:','http:'].includes(url.protocol))return url.protocol+'[data]';
  return url.origin+url.pathname;
 }catch{return '[invalid-url]';}
}
export function interpret(results) {
 if(results.base!=='yes')return 'A에서 같은 증상이 재현되지 않으면 B·C 결과로 원인을 판단할 수 없습니다. A 결과부터 전달해 주세요.';
 if(!results.static||!results.plain)return 'A에서 재현됐습니다. 같은 휴대폰·브라우저·화면 크기로 B와 C를 확인해 주세요.';
 if(results.static==='no'&&results.plain==='yes')return '실행 코드 또는 그 코드가 만드는 동작을 우선 조사할 단서입니다. 코드 한 곳이 원인이라고 확정하는 결과는 아닙니다.';
 if(results.static==='yes'&&results.plain==='no')return '화면 스타일·요소 배치·기본 링크의 클릭 범위를 우선 조사할 단서입니다.';
 if(results.static==='no'&&results.plain==='no')return '실행 코드와 화면 배치의 상호작용, 또는 진단 조건 변화의 영향을 더 나눠 확인해야 합니다.';
 return '실행 코드·스타일을 각각 제외해도 재현됩니다. 기본 링크·문서 정보 및 페이지 밖 앱 실행 경로까지 확인해야 합니다.';
}
