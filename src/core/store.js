const clone=v=>JSON.parse(JSON.stringify(v));

export function createMemoryStore(seed={}){
  let state=clone(seed);
  return {
    async get(key,fallback=null){return key in state?clone(state[key]):clone(fallback);},
    async set(key,value){state[key]=clone(value);return clone(value);},
    async remove(key){delete state[key];},
    async dump(){return clone(state);}
  };
}

export function createBrowserStore(prefix='jcs:v3:stage1:'){
  if(typeof localStorage==='undefined') return createMemoryStore();
  return {
    async get(key,fallback=null){
      const raw=localStorage.getItem(prefix+key); if(raw===null)return clone(fallback);
      try{return JSON.parse(raw);}catch{return clone(fallback);}
    },
    async set(key,value){localStorage.setItem(prefix+key,JSON.stringify(value));return clone(value);},
    async remove(key){localStorage.removeItem(prefix+key);},
    async dump(){const out={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k?.startsWith(prefix))continue;try{out[k.slice(prefix.length)]=JSON.parse(localStorage.getItem(k));}catch{}}return out;}
  };
}
