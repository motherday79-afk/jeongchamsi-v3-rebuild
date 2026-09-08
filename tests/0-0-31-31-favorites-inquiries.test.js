import test from 'node:test';
import assert from 'node:assert/strict';

const memoryRedis=()=>{
  const values=new Map(),sorted=new Map();
  const command=async args=>{
    const [op,...rest]=args,upper=String(op).toUpperCase();
    if(upper==='GET')return values.get(rest[0])??null;
    if(upper==='SET'){values.set(rest[0],rest[1]);return 'OK';}
    if(upper==='MGET')return rest.map(key=>values.get(key)??null);
    if(upper==='ZADD'){
      const [key,score,member]=rest,map=sorted.get(key)||new Map();
      map.set(String(member),Number(score));sorted.set(key,map);return 1;
    }
    if(upper==='ZREVRANGE'){
      const [key,start,end]=rest,rows=[...(sorted.get(key)||new Map()).entries()].sort((a,b)=>b[1]-a[1]).map(([member])=>member);
      return rows.slice(Number(start),Number(end)+1);
    }
    throw new Error(`UNSUPPORTED_REDIS_COMMAND:${upper}`);
  };
  return {command,values,sorted};
};

test('favorites toggle only real targets and build all five mypage sections',async()=>{
  const mod=await import('../lib/favorite-service.js').catch(()=>({}));
  assert.equal(typeof mod.createFavoriteService,'function');
  const redis=memoryRedis(),posts={community:{'post-1':{id:'post-1',title:'내가 쓴 글',ownerId:'member-1',author:'회원',published:true},'post-2':{id:'post-2',title:'즐겨찾기 글',ownerId:'member-2',author:'다른회원',published:true}}};
  const service=mod.createFavoriteService({
    command:redis.command,
    getPerson:async id=>id==='assembly-001'?{id,name:'김민석',party:'더불어민주당',photo:{localPath:'/a.jpg'}}:null,
    getPost:async(domain,id)=>posts[domain]?.[id]||null,
    listDomain:async domain=>Object.values(posts[domain]||{})
  });
  const user={id:'member-1',nickname:'회원',role:'member'};
  assert.deepEqual(await service.toggle(user,{kind:'person',id:'assembly-001'}),{ok:true,active:true,key:'person:assembly-001'});
  assert.equal((await service.toggle(user,{kind:'post',domain:'community',id:'post-2'})).active,true);
  assert.equal((await service.toggle(user,{kind:'person',id:'missing'})).error,'FAVORITE_TARGET_NOT_FOUND');
  const dashboard=await service.dashboard(user);
  assert.deepEqual(dashboard.favoritePeople.map(item=>item.id),['assembly-001']);
  assert.deepEqual(dashboard.favoritePosts.map(item=>item.id),['post-2']);
  assert.deepEqual(dashboard.authoredPosts.map(item=>item.id),['post-1']);
});

test('inquiries expose public posts to everyone, private posts only to owner/admin, and accept admin answers',async()=>{
  const mod=await import('../lib/inquiry-service.js').catch(()=>({}));
  assert.equal(typeof mod.createInquiryService,'function');
  const redis=memoryRedis();let sequence=0;
  const service=mod.createInquiryService({command:redis.command,now:()=>new Date(`2026-09-08T00:00:0${sequence++}.000Z`),randomId:()=>`id-${sequence}`});
  const owner={id:'member-1',nickname:'작성자',role:'member'},other={id:'member-2',nickname:'다른회원',role:'member'},admin={id:'admin',nickname:'관리자',role:'admin'};
  const publicItem=await service.create(owner,{title:'공개 문의',body:'누구나 읽는 문의',visibility:'public'});
  const privateItem=await service.create(owner,{title:'비공개 문의',body:'관리자만 답변',visibility:'private'});
  assert.deepEqual((await service.list(null)).items.map(item=>item.id),[publicItem.item.id]);
  assert.equal((await service.get(privateItem.item.id,other)).error,'INQUIRY_FORBIDDEN');
  assert.equal((await service.get(privateItem.item.id,owner)).item.title,'비공개 문의');
  assert.equal((await service.get(privateItem.item.id,admin)).item.title,'비공개 문의');
  assert.equal((await service.reply(privateItem.item.id,admin,'확인했습니다')).item.answer.body,'확인했습니다');
  assert.equal((await service.reply(publicItem.item.id,other,'회원 답변')).error,'ADMIN_REQUIRED');
});
