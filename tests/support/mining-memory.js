// Redis boundary substitute for deterministic service tests and local preview only.
export function memoryMineStore(){
 const values=new Map(),hashes=new Map(),sets=new Map();
 return async args=>{
  const [op,...a]=args;
  if(op==='GET')return values.get(a[0])??null;
  if(op==='SET'){values.set(a[0],a[1]);return 'OK';}
  if(op==='HGET')return hashes.get(a[0])?.get(a[1])??null;
  if(op==='SCARD')return sets.get(a[0])?.size||0;
  if(op==='EVAL'){
   const [script,count,...rest]=a,keys=rest.slice(0,Number(count)),argv=rest.slice(Number(count));
   if(script.includes('MINE_TRANSACTION_278')){
    for(let i=0;i<keys.length-1;i++)if((values.get(keys[i])||'')!==argv[i*2])return 0;
    for(let i=0;i<keys.length-1;i++)values.set(keys[i],argv[i*2+1]);
    const delta=Number(argv[keys.length*2-2]);if(delta>0)values.set(keys.at(-1),String(Number(values.get(keys.at(-1))||0)+delta));
    return 1;
   }
   if(!script.includes('MINE_CAS_275')&&!script.includes('MINE_VISIT_275'))throw Error('Unexpected Lua');
   if((values.get(keys[0])||'')!==argv[0])return 0;
   if(script.includes('MINE_CAS_275')&&keys.length>1)values.set(keys[1],String(Number(values.get(keys[1])||0)+Number(argv[2])));
   values.set(keys[0],argv[1]);
   if(script.includes('MINE_VISIT_275')&&argv[2]==='1'){
    const h=hashes.get(keys[1])||new Map();h.set('visits',(h.get('visits')||0)+1);hashes.set(keys[1],h);
    const s=sets.get(keys[2])||new Set();s.add(argv[3]);sets.set(keys[2],s);
   }return 1;
  }throw Error('Unexpected Redis command '+op);
 };
}
