const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=readFileSync(__dirname+'/../assets/startup-ready.js','utf8');
function ready({app=true,loading=false,flag=null,page=true,children=1,text='정참시'}={}){
 return vm.runInNewContext(script,{document:{getElementById:()=>app?{hasAttribute:()=>flag!==null,getAttribute:()=>flag,querySelector:s=>s==='.app-initial-loading'?loading:page?{children:Array(children),textContent:text}:null}:null}});
}
assert.equal(ready({app:false}),false);
assert.equal(ready({loading:true,flag:'true'}),false);
assert.equal(ready({flag:'false'}),false);
assert.equal(ready({flag:'true'}),true);
assert.equal(ready({page:false}),false);
assert.equal(ready({children:0}),false);
assert.equal(ready({text:'   '}),false);
assert.equal(ready(),true);
console.log('WebView readiness: 8 cases passed');
