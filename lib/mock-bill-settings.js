import {MOCK_BILL} from '../src/data/mock-bill.js';
const KEY='jcsr2:mock-bill-settings:v1';
export function createMockBillSettings({command}){return {
 async get(){const raw=await command(['GET',KEY]);if(!raw)return {introduction:MOCK_BILL.methodology};const data=JSON.parse(raw);return {introduction:String(data.introduction??MOCK_BILL.methodology)};},
 async save(input){if(typeof input?.introduction!=='string'||input.introduction.length>3000)throw Error('INVALID_INTRODUCTION');const value={introduction:input.introduction.trim()};await command(['SET',KEY,JSON.stringify(value)]);return value;}
};}
