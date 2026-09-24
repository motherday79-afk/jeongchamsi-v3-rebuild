export const RACES={orc:'오크',elf:'엘프',dwarf:'드워프',human:'휴먼',goblin:'고블린'};
export const PICKS=[
 {id:'rust',name:'쓸모없는 곡괭이',level:1,price:0,amount:1,hits:1,color:'#bb956b'},
 {id:'iron',name:'곡괭이',level:5,price:50,amount:2,hits:1,color:'#e8c997'},
 {id:'silver',name:'쓸만한 곡괭이',level:15,price:300,amount:3,hits:1,color:'#c9eaff'},
 {id:'gold',name:'숙련자의 곡괭이',level:30,price:1500,amount:4,hits:1,color:'#ffdc67'},
 {id:'mystic',name:'신비한 곡괭이',level:50,price:6000,amount:6,hits:1,color:'#c085ff'},
 {id:'dimension',name:'차원의 곡괭이',level:70,price:18000,amount:8,hits:1,color:'#c1ffff'},
 {id:'dark',name:'어둠의 곡괭이',level:90,price:45000,amount:10,hits:1,color:'#ff355e'},
 {id:'heaven',name:'천상의 곡괭이',level:110,price:100000,amount:12,hits:1,extraChance:.25,color:'#fff1a9'},
 {id:'lightning',name:'번개맞은 곡괭이',level:130,price:220000,amount:10,hits:2,color:'#75cfff'},
 {id:'wind',name:'바람의 곡괭이',level:150,price:450000,amount:9,hits:3,color:'#98ffde'}
];
export const levelValue=(level,values)=>{
 const l=Math.max(1,Math.min(150,Number(level)||1)),anchors=[1,20,50,100,150];
 for(let i=1;i<anchors.length;i++)if(l<=anchors[i])return values[i-1]+(values[i]-values[i-1])*(l-anchors[i-1])/(anchors[i]-anchors[i-1]);
 return values[4];
};
export function progression(pick,worker,storage){return {
 chance:Number(levelValue(pick,[.03,.06,.09,.14,.2]).toFixed(8)),
 autoMs:Math.round(levelValue(worker,[3000,2800,2500,2000,1500])),
 capacity:Math.round(levelValue(storage,[10,50,200,800,2000]))
};}
export function upgradeCost(level,target){
 // Cost rises continuously at each level, with progressively steeper bands.
 const l=Math.min(150,Math.max(1,level)),factor={pick:1,worker:1.15,storage:1.25}[target];
 const base=l<=20?5*1.15**(l-1):l<=50?5*1.15**19*1.07**(l-20):l<=100?5*1.15**19*1.07**30*1.035**(l-50):5*1.15**19*1.07**30*1.035**50*1.045**(l-100);
 return Math.ceil(base*factor);
}
export function equippedPick(s){
 if(s.tool==='trial')return {...PICKS[3],id:'trial',visual:'gold',name:'숙련자의 곡괭이 · 체험',amount:1,extraChance:.25};
 const found=PICKS.find(p=>p.id===s.tool);
 if(found)return {...found,visual:found.id};
 if(s.paidPicks?.includes(s.tool))return {...PICKS[3],id:s.tool,visual:'gold',name:'보유 유료 곡괭이',amount:1,extraChance:.25};
 return {...PICKS[0],visual:'rust'};
}
