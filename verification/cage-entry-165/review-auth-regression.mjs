import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createNavigation} from '/workspace/scratch/b627f5328562/qa161/source-155/src/core/navigation.js';
import {cageLoginReturn} from '/workspace/scratch/b627f5328562/qa161/source-155/src/core/cage-entry.js';
const source=await readFile('/workspace/scratch/b627f5328562/qa161/source-155/src/app.js','utf8');
const start=source.indexOf("if(result?.status===401&&");
const end=source.indexOf('if(result?.route)',start);
assert.ok(start>=0&&end>start);
const run=new Function('result','type','navigation','route','cageLoginReturn',source.slice(start,end));
for(const camp of ['progressive','conservative']) {
 const intended=`/community/cage-a?camp=${camp}&compose=1`;
 const login='/login?next='+encodeURIComponent(intended);
 const window={location:{},scrollX:0,scrollY:0,addEventListener(){},history:{state:null,replaceState(state,_title,url){this.state=state;const parsed=new URL(url,'https://fixture.invalid');Object.assign(window.location,{pathname:parsed.pathname,search:parsed.search,hash:parsed.hash});},pushState(state,title,url){this.replaceState(state,title,url);}}};
 window.history.replaceState(null,'',login);
 const seen=[];
 const navigation=createNavigation({window,onRoute:route=>seen.push(route)});
 navigation.start();
 run({ok:false,status:401,error:'INVALID_LOGIN'},'login',navigation,navigation.route,cageLoginReturn);
 assert.equal(navigation.route(),login);
 run({ok:true,status:200},'login',navigation,navigation.route,cageLoginReturn);
 assert.equal(navigation.route(),intended);
 console.log(JSON.stringify({camp,intended,actualRoutes:seen,result:'Failed login preserves the intended camp; retry reaches its composer.'}));
}
