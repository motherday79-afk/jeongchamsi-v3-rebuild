export function storage(){
 const values=new Map(),hashes=new Map();let conflict=false;
 return {values,conflict:()=>{conflict=true;},command:async args=>{
 const [op,...a]=args;if(op==='GET')return values.get(a[0])??null;if(op==='HVALS')return [...(hashes.get(a[0])||new Map()).values()];
 if(op==='EVAL'){const n=Number(a[1]),keys=a.slice(2,2+n),argv=a.slice(2+n);if(conflict){conflict=false;return 0;}if((values.get(keys[0])||'')!==argv[0])return 0;if(n===3&&(values.get(keys[2])||'')!==argv[4])return 0;values.set(keys[0],argv[1]);if(!hashes.has(keys[1]))hashes.set(keys[1],new Map());hashes.get(keys[1]).set(argv[3],argv[2]);if(n===3)values.set(keys[2],argv[5]);return 1;}
 throw Error('unexpected '+op);
 }};
}
