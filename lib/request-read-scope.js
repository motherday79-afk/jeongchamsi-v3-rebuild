// Share read-only values within one HTTP request, never across users/requests.
export function createRequestReadScope(command){
  const reads=new Map();
  return args=>{
    if(args[0]==='MGET')return command(args);
    if(args[0]!=='GET'||args.length!==2){reads.clear();return command(args);}
    const key=args[1];
    if(reads.has(key))return reads.get(key);
    const pending=Promise.resolve().then(()=>command(args)).catch(error=>{
      if(reads.get(key)===pending)reads.delete(key);
      throw error;
    });
    reads.set(key,pending);
    return pending;
  };
}
