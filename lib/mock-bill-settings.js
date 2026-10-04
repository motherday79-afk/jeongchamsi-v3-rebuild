import {MOCK_BILL} from '../src/data/mock-bill.js';
import {validateVotes,validateProposal} from './mock-bill-editing.js';
const KEY='jcsr2:mock-bill-settings:v1';
export function createMockBillSettings({command}){return {
 async get(){const [raw,votes,proposal]=await Promise.all([command(['GET',KEY]),command(['GET',KEY+':votes']),command(['GET',KEY+':proposal'])]);return {introduction:String((raw?JSON.parse(raw):{}).introduction??MOCK_BILL.methodology),votes:votes?JSON.parse(votes):MOCK_BILL.parties.map(({id,yes,no,abstain})=>({id,yes,no,abstain})),proposal:proposal?JSON.parse(proposal):{summary:MOCK_BILL.summary,facts:MOCK_BILL.facts,sections:MOCK_BILL.sections}};},
 async save(input){const entries=[];if(Object.hasOwn(input,'introduction')){if(typeof input.introduction!=='string'||input.introduction.length>3000)throw Error('INVALID_INTRODUCTION');entries.push(KEY,JSON.stringify({introduction:input.introduction.trim()}));}if(Object.hasOwn(input,'votes'))entries.push(KEY+':votes',JSON.stringify(validateVotes(input.votes)));if(Object.hasOwn(input,'proposal'))entries.push(KEY+':proposal',JSON.stringify(validateProposal(input.proposal)));if(!entries.length)throw Error('INVALID_INPUT');await command(['MSET',...entries]);return this.get();}
};}
