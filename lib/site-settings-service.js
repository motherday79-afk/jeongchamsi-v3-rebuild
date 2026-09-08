import { TARGET_KEYS } from './migration-service.js';

const FIELD_LIMITS=Object.freeze({siteName:60,businessName:120,businessRegistrationNumber:40,mailOrderRegistrationNumber:80,representative:60,phone:40,fax:40,address:240,privacyOfficer:80,privacyEmail:160,adEmail:160,customerEmail:160,partnerEmail:160,managementEmail:160,disclaimer:500});
const EMAIL_FIELDS=new Set(['privacyEmail','adEmail','customerEmail','partnerEmail','managementEmail']);
const clean=value=>String(value??'').trim();

export function sanitizeFooterInfo(input={}){
  const safe={};
  for(const [key,limit] of Object.entries(FIELD_LIMITS)){
    const value=clean(input?.[key]).slice(0,limit);
    if(!value)continue;
    if(EMAIL_FIELDS.has(key)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))continue;
    safe[key]=value;
  }
  return safe;
}

export function createSiteSettingsService({command,now=Date.now}={}){
  if(typeof command!=='function')throw new Error('SITE_SETTINGS_STORAGE_MISSING');
  return {
    async get(){
      const raw=await command(['GET',TARGET_KEYS.footerInfo]);
      if(!raw)return {};
      try{const parsed=JSON.parse(raw);return {...sanitizeFooterInfo(parsed),...(parsed.updatedAt?{updatedAt:String(parsed.updatedAt)}:{}),...(parsed.updatedBy?{updatedBy:String(parsed.updatedBy)}:{})};}catch{return {};}
    },
    async save(input={},actor=''){
      const value={...sanitizeFooterInfo(input),updatedAt:new Date(now()).toISOString(),updatedBy:clean(actor).slice(0,40)};
      await command(['SET',TARGET_KEYS.footerInfo,JSON.stringify(value)]);
      return value;
    }
  };
}

export const KEYWORD_RULES_KEY='jcsr2:political-keyword-rules:v1';
export function sanitizeKeywordRules(input={}){
 const list=value=>[...new Set((Array.isArray(value)?value:String(value||'').split(/[\n,]/)).map(value=>String(value).trim().slice(0,40)).filter(Boolean))].slice(0,50);
 const map=value=>Object.fromEntries(Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{}).filter(([key,v])=>key&&typeof v==='string'&&v.trim()).slice(0,100).map(([key,v])=>[key.slice(0,40),v.trim().slice(0,40)]));
 return {hidden:list(input.hidden),pinned:list(input.pinned),aliases:map(input.aliases),labels:map(input.labels)};
}
