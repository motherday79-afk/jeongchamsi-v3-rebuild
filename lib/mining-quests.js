import {raidDay,publicRaid} from './mining-raid.js';
export function publicQuests(s,now){
 const day=raidDay(now),q=s.dailyQuests?.day===day?s.dailyQuests:{};
 const autoStart=Math.min(1,q.autoStart||0),collect=Math.min(5,q.collect||0),raid=publicRaid(s,now).complete;
 const valley=!!q.valley,forest=!!q.forest;
 return {day,autoStart,collect,valley,forest,completed:Number(autoStart===1)+Number(collect===5)+Number(raid)+Number(valley)+Number(forest),total:5};
}
export function recordQuest(s,action,now){
 const day=raidDay(now);
 if(s.dailyQuests?.day!==day)s.dailyQuests={day,autoStart:0,collect:0};
 if(action==='forest-success')s.dailyQuests.forest=true;
 if(action==='valley-success')s.dailyQuests.valley=true;
 if(action==='auto-start')s.dailyQuests.autoStart=1;
 if(action==='collect')s.dailyQuests.collect=Math.min(5,s.dailyQuests.collect+1);
}
