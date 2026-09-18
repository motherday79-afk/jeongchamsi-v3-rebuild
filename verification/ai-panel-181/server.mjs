// Local-only browser verification. All data is disposable, invented QA data.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createAiPanelService} from '../../lib/ai-panel-service.js';
import {aiPanelRequest} from '../../lib/ai-panel-http.js';
import {storage} from '../../tests/helpers/ai-panel-storage.js';
const root=process.cwd(),db=storage(),admin={id:'local-qa',role:'admin',status:'active'},service=createAiPanelService({command:db.command});
const profiles=Array.from({length:1000},(_,i)=>({id:`JCS-AI-${String(i+1).padStart(4,'0')}`,gender:'QA 가상',age:'QA 연령',region:'QA 지역',politicalInterest:'QA 입력',pollExposure:false,occupation:'QA 직업'}));
const {item:panel}=await service.save(admin,{operation:'panel-create',input:{name:'LOCAL QA ONLY',profiles,population:{sourceUrl:'https://example.org/qa',referenceDate:'2026-09-19'}}});
let {item:run}=await service.save(admin,{operation:'create',input:{panelId:panel.id,week:'2026-W38',basisDate:'2026-09-19',question:'[로컬 검증용 가상 자료] 예시 질문',questionVersion:'qa1',modes:['EXPOSED']}});
for(const [operation,input] of [['environment',{mode:'EXPOSED',notes:'LOCAL QA ONLY',sources:[]}],['responses',{mode:'EXPOSED',model:'QA fixture (not real model)',executedAt:'2026-09-19T00:00:00Z',responses:profiles.map((p,i)=>({id:p.id,choice:i%2?'positive':'negative',reason:'로컬 검증용 가상 사유',explanation:'실제 AI 조사 결과가 아닙니다.',factors:[]}))}],['human',{poll:{id:'qa-poll',institution:'QA 가상 기관',sourceUrl:'https://example.org/qa',question:'QA',comparable:true,results:{overall:{positive:40,negative:50,undecided:10}}}}],['review',{}],['lock',{}],['publish',{}]])({item:run}=await service.save(admin,{operation,id:run.id,version:run.version,input}));
const shell=await fs.readFile(path.join(root,'index.html'),'utf8');
const page=shell.replace(/<script type="module"[^>]+><\/script>/,'<script type="module" src="/verification/ai-panel-181/preview.js"></script>');
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:8181');if(url.pathname==='/api/v3/ai-panel'){let body='';for await(const chunk of req)body+=chunk;req.body=body||undefined;const result=await aiPanelRequest(req,{service,user:admin,url});res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result.data));return;}
 if(url.pathname==='/'||url.pathname==='/ai-panel'||url.pathname==='/admin/ai-panel'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(page);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error();const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(8181,'127.0.0.1',()=>console.log('QA only: http://127.0.0.1:8181'));
