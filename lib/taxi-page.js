import {readFileSync} from 'node:fs';
import {canAccessTaxi} from '../src/core/taxi-access.js';
export function taxiPage(user){
 if(canAccessTaxi(user))return {status:200,html:readFileSync(new URL('../taxi/index.html',import.meta.url),'utf8')};
 return {status:user?.id?403:401,html:`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JCS 리얼택시 · 계정 이용 제한</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4ecd9;color:#283e36;font-family:system-ui}main{padding:32px;max-width:420px}p{line-height:1.8}a{display:inline-block;margin:16px 18px 0 0;color:inherit}</style><main><small>JCS REAL TAXI</small><h1>계정 이용 제한</h1><p>현재 계정 상태에서는 리얼택시를 이용할 수 없습니다.</p><a href="/">정참시 홈</a></main></html>`};
}
