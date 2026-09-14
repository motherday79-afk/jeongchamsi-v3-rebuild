import { renderCampaignBoard, renderCampaignDetail } from '../views/campaign-pages.js?v=0.0.31.159';
import { renderCampaignEditor } from '../views/campaign-editor.js?v=0.0.31.159';

export async function loadCampaignPage({parts=[],searchParams=new URLSearchParams(),session={},client}={}){
  const admin=session?.authenticated===true&&session.user?.role==='admin';
  const view=['current','archive','manage'].includes(searchParams.get('view'))?searchParams.get('view'):'current';
  const category=['politics','culture','business'].includes(searchParams.get('category'))?searchParams.get('category'):'all';
  try{
    if(parts[1]==='write')return renderCampaignEditor(null,session);
    if(parts[2]==='edit'){
      if(!admin)return renderCampaignEditor(null,session);
      const result=await client.get(parts[1],{edit:true});
      if(result.ok)return renderCampaignEditor(result.item,session);
      if(result.error==='CAMPAIGN_NOT_FOUND')return renderCampaignDetail(null,session);
      throw new Error('LOAD_FAILED');
    }
    if(parts[1]){
      const result=await client.get(parts[1],{edit:false});
      if(result.ok)return renderCampaignDetail(result.item,session);
      if(result.error==='CAMPAIGN_NOT_FOUND')return renderCampaignDetail(null,session);
      throw new Error('LOAD_FAILED');
    }
    if(view==='manage'&&!admin)return renderCampaignBoard(null,session,view);
    const listOptions={view,page:searchParams.get('page')||1};if(category!=='all')listOptions.category=category;
    const result=await client.list(listOptions);
    if(!result.ok)throw new Error('LOAD_FAILED');
    return renderCampaignBoard(result,session,view,category);
  }catch{
    return renderCampaignBoard({ok:false,error:'잠시 후 다시 시도해 주세요. 입력 중인 내용이 있다면 창을 닫기 전에 보관해 주세요.'},session,view);
  }
}
