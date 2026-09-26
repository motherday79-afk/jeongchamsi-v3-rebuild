import {raidDay,publicRaid} from './mining-raid.js';
export function publicQuests(s,now){
 const day=raidDay(now),q=s.dailyQuests?.day===day?s.dailyQuests:{};
 const autoStart=Math.min(1,q.autoStart||0),collect=Math.min(5,q.collect||0),raid=publicRaid(s,now).complete;
 const ruins=!!q.ruins;
 const eye=!!q.eye,tower=!!q.tower;
 const valley=!!q.valley,forest=!!q.forest;
 return {ruins,day,autoStart,collect,valley,forest,eye,tower,completed:Number(autoStart===1)+Number(collect===5)+Number(raid)+Number(valley)+Number(forest)+Number(eye)+Number(tower)+Number(ruins),total:8};
}
export function recordQuest(s,action,now){
 const day=raidDay(now);
 if(s.dailyQuests?.day!==day)s.dailyQuests={day,autoStart:0,collect:0};
 if(action==='ruins-success')s.dailyQuests.ruins=true;
 if(action==='tower-success')s.dailyQuests.tower=true;
 if(action==='eye-success')s.dailyQuests.eye=true;
 if(action==='forest-success')s.dailyQuests.forest=true;
 if(action==='valley-success')s.dailyQuests.valley=true;
 if(action==='auto-start')s.dailyQuests.autoStart=1;
 if(action==='collect')s.dailyQuests.collect=Math.min(5,s.dailyQuests.collect+1);
}
