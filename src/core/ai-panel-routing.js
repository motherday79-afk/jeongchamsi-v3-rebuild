import {renderAiPanelPublic,renderAiPanelAdmin} from '../views/ai-panel-pages.js?v=0.0.31.182';
export async function loadAiPanelPage({admin=false,params=new URLSearchParams(),session={},client}={}){
 if(admin&&!(session.authenticated&&session.user?.role==='admin'&&session.user?.status==='active'))return renderAiPanelAdmin({session});
 const [list,human]=await Promise.all([client.list({manage:admin}),client.humanPolls?.()||Promise.resolve({})]);const id=params.get('id')||(!admin?list.items?.[0]?.id:'');const detail=id?await client.get(id,{edit:admin}):{};
 if(admin){if(params.get('panelId'))list.selectedPanel=await client.panel(params.get('panelId'));return renderAiPanelAdmin({session,data:list,detail,params,human});}
 const profiles=detail.item?.panel?.profiles||[],q=(params.get('q')||'').trim().toLowerCase(),age=params.get('age'),filtered=profiles.filter(x=>(!q||x.id.toLowerCase().includes(q))&&(!age||String(x.age)===age));
 const page=Math.min(Math.max(1,Math.ceil(filtered.length/50)),Math.max(1,Math.floor(Number(params.get('page'))||1)));
 const selected=params.get('tab')==='panels'?(profiles.find(x=>x.id===params.get('panel'))||filtered[(page-1)*50])?.id:'';
 const idHistory=selected?await client.history(selected,params.get('historyPage')||1):{};
 return renderAiPanelPublic({list,detail,params,idHistory,human});
}
