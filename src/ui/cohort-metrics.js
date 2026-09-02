const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));

export function gallupPartySupport(sources=[]){
  const source=(Array.isArray(sources)?sources:[]).find(item=>/한국갤럽/.test(String(item?.type||'')));
  const match=String(source?.detail||'').match(/지지도\s*([0-9]+(?:\.[0-9]+)?)%/);
  return match?clamp(match[1]):null;
}

export function jcsSupportConversion(data,attention){
  if(!finite(attention))return null;
  const partySupport=gallupPartySupport(data?.sources),transition=(data?.transition||[]).find(item=>/전환/.test(String(item?.label||'')))?.score;
  const risk=data?.support?.risk??(data?.core||[]).find(item=>/변동성|위험/.test(String(item?.label||'')))?.score;
  if(!finite(partySupport)||!finite(transition)||!finite(risk))return null;
  return clamp(Number(attention)*(partySupport/100)*(Number(transition)/100)*(1-Number(risk)/100));
}
