import test from 'node:test';
import assert from 'node:assert/strict';
import { collectLegacySnapshot, writeRebuildSnapshot, TARGET_KEYS } from '../lib/migration-service.js';

function fakeRedis(seed={}){
  const map=new Map(Object.entries(seed));
  return {
    map,
    async command(args){
      const op=String(args[0]||'').toUpperCase();
      if(op==='GET') return map.get(args[1]) ?? null;
      if(op==='SET'){map.set(args[1],args[2]);return 'OK';}
      if(op==='MGET') return args.slice(1).map(k=>map.get(k)??null);
      if(op==='SCAN'){
        const pattern=String(args[3]||'*').replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
        const re=new RegExp(`^${pattern}$`);
        return ['0',[...map.keys()].filter(k=>re.test(k))];
      }
      throw new Error('UNSUPPORTED '+op);
    }
  };
}

test('collectLegacySnapshot only collects approved legacy domains and all user activities',async()=>{
  const source=fakeRedis({
    'jcv3:users:v2':JSON.stringify({u1:{id:'u1',role:'admin',passwordHash:'scrypt$a$b'},u2:{id:'u2',role:'member',passwordHash:'scrypt$c$d'}}),
    'jcv3:useractivity:v1:u1':JSON.stringify({likedPosts:['community:p1']}),
    'jcv3:useractivity:v1:u2':JSON.stringify({pollVotes:{p:'o'}}),
    'jcv3:content:v4:community':JSON.stringify({items:[{id:'p1',ownerId:'u1',title:'old'}]}),
    'jcv3:content:v4:comments':JSON.stringify({items:[{id:'c1',domain:'community',postId:'p1',ownerId:'u2'}]}),
    'jcv3:content:v4:keywords':JSON.stringify({items:[{label:'should-not-copy'}]})
  });
  const snap=await collectLegacySnapshot(source.command);
  assert.equal(Object.keys(snap.users).length,2);
  assert.equal(Object.keys(snap.activities).length,2);
  assert.equal(snap.contents.community.items[0].title,'old');
  assert.equal('keywords' in snap.contents,false);
});

test('writeRebuildSnapshot writes into isolated rebuild namespace',async()=>{
  const target=fakeRedis();
  const snap={users:{u1:{id:'u1'}},activities:{u1:{favorites:[]}},contents:{community:{items:[{id:'p1'}]}}};
  const report=await writeRebuildSnapshot(target.command,snap);
  assert.equal(report.ok,true);
  assert.equal(JSON.parse(target.map.get(TARGET_KEYS.users)).u1.id,'u1');
  assert.equal(JSON.parse(target.map.get(TARGET_KEYS.activity('u1'))).favorites.length,0);
  assert.equal(JSON.parse(target.map.get(TARGET_KEYS.content('community'))).items[0].id,'p1');
  assert.equal([...target.map.keys()].some(k=>k.startsWith('jcv3:')),false);
});
