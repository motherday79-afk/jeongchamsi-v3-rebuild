import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoisAgeSex, selectAgeSexForPerson } from '../lib/official-public-data.js';

function row(name,values){return `<tr><td>1100000000</td><td>${name}</td>${values.map(value=>`<td>${value.toLocaleString('ko-KR')}</td>`).join('')}</tr>`;}

test('MOIS public table becomes five independent male/female cohort shares',()=>{
  // After region: total+range+11 total cohorts, male total+range+11, female total+range+11.
  const values=Array(39).fill(0);values[0]=10000;values[1]=10000;
  [100,200,300,400,500,600,700,800,900,1000,1100].forEach((value,i)=>values[2+i]=value);
  values[13]=4900;values[14]=4900;[60,120,180,240,300,360,420,480,540,600,660].forEach((value,i)=>values[15+i]=value);
  values[26]=5100;values[27]=5100;[40,80,120,180,260,360,500,700,900,1100,1300].forEach((value,i)=>values[28+i]=value);
  const parsed=parseMoisAgeSex(`<table>${row('서울특별시',values)}</table>`);
  const selected=selectAgeSexForPerson(parsed,{region:'서울'});
  assert.deepEqual(selected.map(item=>item.age),['20대','30대','40대','50대','60대 이상']);
  assert.equal(selected[0].maleShare,60);
  assert.equal(selected[0].femaleShare,40);
  assert.notEqual(selected[0].maleShare,selected[4].maleShare);
  assert.equal(parsed.source.provider,'MOIS_RESIDENT_POPULATION');
});
