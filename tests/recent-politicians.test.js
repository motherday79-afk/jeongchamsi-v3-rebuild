import test from 'node:test';
import assert from 'node:assert/strict';

const recentModule=await import('../src/ui/recent-politicians.js').catch(()=>({}));

test('a repeat visit moves the politician to the front and keeps only four unique people',()=>{
  assert.equal(typeof recentModule.updateRecentPoliticians,'function');
  const existing=[
    {id:'p1',name:'첫째'},{id:'p2',name:'둘째'},{id:'p3',name:'셋째'},{id:'p4',name:'넷째'}
  ];
  const result=recentModule.updateRecentPoliticians(existing,{id:'p3',name:'셋째',party:'개혁신당',office:'국회의원'});
  assert.deepEqual(result.map(item=>item.id),['p3','p1','p2','p4']);
  assert.equal(result[0].party,'개혁신당');
});

test('recent politician storage tolerates malformed data and persists a safe compact record',()=>{
  assert.equal(typeof recentModule.loadRecentPoliticians,'function');
  assert.equal(typeof recentModule.saveRecentPoliticians,'function');
  const values=new Map([['jcs:recent-politicians:v1','not json']]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.deepEqual(recentModule.loadRecentPoliticians(storage),[]);
  const saved=recentModule.saveRecentPoliticians(storage,[{id:'p1',name:'정치인',party:'정당',office:'직책',photo:{localPath:'/photo.jpg',focus:'50% 20%'},secret:'drop'}]);
  assert.deepEqual(saved,[{id:'p1',name:'정치인',party:'정당',office:'직책',photo:{localPath:'/photo.jpg',focus:'50% 20%'}}]);
  assert.deepEqual(JSON.parse(values.get('jcs:recent-politicians:v1')),saved);
});

test('recording a rendered detail page saves its politician as the newest visit',()=>{
  assert.equal(typeof recentModule.recordRecentPolitician,'function');
  const values=new Map([['jcs:recent-politicians:v1',JSON.stringify([{id:'old',name:'기존'}])]]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const root={querySelector:selector=>selector==='[data-recent-politician]'?{dataset:{recentId:'new',recentName:'새 인물',recentParty:'조국혁신당',recentOffice:'국회의원',recentPhoto:'/new.jpg',recentFocus:'50% 25%'}}:null};
  const saved=recentModule.recordRecentPolitician(root,storage);
  assert.deepEqual(saved.map(item=>item.id),['new','old']);
  assert.equal(saved[0].photo.localPath,'/new.jpg');
});
