export const COSTUME_SLOTS=['top','bottom','head','gloves','boots'];
export const defaultCostume=()=>({top:'classic',bottom:'classic',head:'classic',gloves:'classic',boots:'classic'});
export function readCostume(state,character=state.character){return {...defaultCostume(),...(state.costumes?.[character]||{})};}
export function saveCostume(state,input){
 if(!['strong','glamour','elf'].includes(input.character)||!input.costume||Array.isArray(input.costume)||typeof input.costume!=='object')throw Error('MINE_COSTUME');
 for(const slot of Object.keys(input.costume))if(!COSTUME_SLOTS.includes(slot))throw Error('MINE_COSTUME');
 const costume={};
 for(const slot of COSTUME_SLOTS){const value=input.costume[slot];if(!(slot==='top'||slot==='bottom'?['none','classic','alternate']:['none','classic']).includes(value))throw Error('MINE_COSTUME');costume[slot]=value;}
 if(input.character!=='elf'&&(costume.top==='none'||costume.bottom==='none'))throw Error('MINE_COSTUME_BASE');
 state.costumes={...(state.costumes||{}),[input.character]:costume};return {costume};
}
