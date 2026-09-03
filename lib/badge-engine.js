import { BADGE_CATALOG } from '../src/data/badge-catalog.js';

export const VALID_BADGE_KEYS=new Set(BADGE_CATALOG.map(item=>item.key));
const CATALOG_BY_KEY=new Map(BADGE_CATALOG.map(item=>[item.key,item]));
const AUTOMATIC_TIERS=new Set(['BRONZE','SILVER']);

const number=value=>{const n=Number(value||0);return Number.isFinite(n)?n:0;};
const countObject=value=>Object.keys(value||{}).length;
const dateKey=value=>{const date=new Date(value||0);if(!Number.isFinite(date.getTime()))return '';return new Date(date.getTime()+9*3600000).toISOString().slice(0,10);};

function maxConsecutiveDays(keys=[]){
  const days=[...new Set(keys.filter(Boolean))].sort();let best=0,run=0,previous=null;
  for(const key of days){const time=Date.parse(`${key}T00:00:00.000Z`);run=previous===null?1:(time-previous===86400000?run+1:1);best=Math.max(best,run);previous=time;}
  return best;
}

export function computeBadgeMetrics(userId,activity={},domains={},extras={}){
  const uid=String(userId||'');
  const postsByDomain={community:domains.community?.items||[],itsme:domains.itsme?.items||[],columns:domains.columns?.items||[],news:domains.news?.items||[]};
  const owned=[];
  for(const [domain,items] of Object.entries(postsByDomain))for(const post of items)if(String(post.ownerId||'')===uid)owned.push({...post,domain});
  const comments=domains.comments?.items||[];
  const mine=comments.filter(comment=>String(comment.ownerId||'')===uid);
  const ownKeys=new Set(owned.map(post=>`${post.domain}:${post.id}`));
  const responses=comments.filter(comment=>String(comment.ownerId||'')!==uid&&ownKeys.has(`${comment.domain}:${comment.postId}`));
  const likedGiven=(activity.likedPosts||[]).length;
  const pollCount=countObject(activity.pollVotes),generationCount=countObject(activity.generationVotes),evaluationCount=countObject(activity.nationalEvaluationVotes),academyCount=(activity.academyApplications||[]).length;
  const participationCount=pollCount+generationCount+evaluationCount+academyCount;
  const likesReceived=owned.reduce((sum,post)=>sum+number(post.likes),0),viewsReceived=owned.reduce((sum,post)=>sum+number(post.views),0);
  const events=(activity.badgeSignals?.events||[]).filter(event=>event?.at);
  const visitDateKeys=events.filter(event=>event?.type==='visit').map(event=>dateKey(event.at)).filter(Boolean);
  const activeDateKeys=[...owned.map(post=>dateKey(post.createdAt)),...mine.map(comment=>dateKey(comment.createdAt)),...visitDateKeys].filter(Boolean);
  const engagedThreads=new Set([...mine.map(comment=>`${comment.domain}:${comment.postId}`),...(activity.likedPosts||[]).map(String)]).size;
  const uniqueResponders=new Set(responses.map(comment=>String(comment.ownerId||comment.author||'')).filter(Boolean)).size;
  return {
    actionTotal:owned.length+mine.length+likedGiven+participationCount,
    authoredPosts:owned.length,comments:mine.length,likesGiven:likedGiven,likesReceived,viewsReceived,participationCount,pollCount,generationCount,evaluationCount,academyCount,
    participationTypes:[owned.length>0,mine.length>0,likedGiven>0,pollCount>0,generationCount>0,evaluationCount>0,academyCount>0].filter(Boolean).length,
    activeDays:new Set(activeDateKeys).size,maxStreak:maxConsecutiveDays(visitDateKeys),communityPosts:owned.filter(post=>post.domain==='community').length,itsmePosts:owned.filter(post=>post.domain==='itsme').length,
    uniqueResponders,responsesReceived:responses.length,engagedThreads,highImpactPosts:owned.filter(post=>number(post.likes)>=5||number(post.views)>=100).length,strongImpactPosts:owned.filter(post=>number(post.likes)>=15||number(post.views)>=500).length,
    contentDomains:Object.values(postsByDomain).filter(items=>items.some(post=>String(post.ownerId||'')===uid)).length,ownPostsWithResponses:new Set(responses.map(comment=>`${comment.domain}:${comment.postId}`)).size,
    noonSignals:events.filter(event=>{const hour=(new Date(event.at).getUTCHours()+9)%24;return hour>=11&&hour<=13;}).length,
    midnightSignals:events.filter(event=>(new Date(event.at).getUTCHours()+9)%24===0).length,
    referralsRecruited:number(extras.referralsRecruited)
  };
}

const atLeast=(field,target,label)=>({test:metrics=>number(metrics[field])>=target,progress:metrics=>({current:Math.min(number(metrics[field]),target),target,label})});
const all=(conditions,label)=>({test:metrics=>conditions.every(([field,target])=>number(metrics[field])>=target),progress:metrics=>({current:conditions.filter(([field,target])=>number(metrics[field])>=target).length,target:conditions.length,label})});
const any=(conditions,label)=>({test:metrics=>conditions.some(([field,target])=>number(metrics[field])>=target),progress:metrics=>({current:Math.max(0,...conditions.map(([field,target])=>Math.min(number(metrics[field])/target,1))),target:1,label,ratio:true})});

export const BADGE_RULES=Object.freeze({
  'noon-signal':atLeast('noonSignals',1,'정오 활동'),'midnight':atLeast('midnightSignals',1,'자정 활동'),'weekman':atLeast('maxStreak',7,'연속 활동일'),'superhero':atLeast('maxStreak',30,'연속 활동일'),
  'first-participation':atLeast('actionTotal',1,'참여'),'citizen-choice':atLeast('pollCount',1,'시민 선택'),'policy-proposer':atLeast('itsmePosts',1,"IT’S ME 작성"),'opinion-leader':all([['comments',30],['engagedThreads',8]],'토론 기여'),
  'first-step':atLeast('actionTotal',1,'첫 활동'),'first-voice':atLeast('comments',1,'의견 작성'),'participation-sprout':atLeast('participationCount',3,'선택 참여'),'connection-start':atLeast('engagedThreads',3,'연결한 글'),'attention-start':any([['likesReceived',1],['viewsReceived',20]],'첫 반응'),
  'steady-walker':atLeast('activeDays',7,'활동일'),'diligent-participant':atLeast('actionTotal',20,'누적 참여'),'field-responder':atLeast('participationCount',5,'선택 참여'),'debate-participant':atLeast('comments',10,'의견 작성'),'execution-maker':all([['authoredPosts',5],['participationCount',3]],'작성+참여'),
  'growth-signal':atLeast('likesReceived',10,'받은 반응'),'rising-current':atLeast('viewsReceived',300,'누적 조회'),'potential-spotted':atLeast('highImpactPosts',3,'주목 콘텐츠'),'rising-prospect':atLeast('uniqueResponders',5,'고유 반응자'),'growth-acceleration':all([['likesReceived',20],['viewsReceived',500]],'반응+조회'),
  'communication-connector':atLeast('uniqueResponders',8,'고유 반응자'),'empathy-maker':atLeast('likesReceived',25,'받은 반응'),'conversation-catalyst':atLeast('responsesReceived',20,'후속 댓글'),'community-bridge':all([['engagedThreads',10],['communityPosts',3]],'토론+정뮤니티'),'participation-inducer':atLeast('responsesReceived',30,'후속 참여'),
  'stable-contributor':all([['activeDays',14],['actionTotal',20]],'지속 기여'),'honest-voice':all([['comments',20],['authoredPosts',3]],'의견+작성'),'quality-participant':all([['authoredPosts',5],['likesReceived',15]],'작성+반응'),'trust-builder':all([['activeDays',21],['uniqueResponders',8]],'지속+관계'),'faithful-contributor':any([['activeDays',30],['actionTotal',80]],'장기 기여'),
  'issue-maker':atLeast('highImpactPosts',5,'주목 콘텐츠'),'influence-leader':all([['likesReceived',100],['uniqueResponders',20]],'반응+도달'),'participation-driver':atLeast('responsesReceived',50,'후속 참여'),'public-discussion-expander':all([['itsmePosts',10],['responsesReceived',30]],'제안+토론'),'debate-axis':all([['comments',100],['engagedThreads',20]],'토론 중심성'),'reaction-catalyst':atLeast('likesReceived',150,'받은 반응'),'community-hub':all([['uniqueResponders',30],['comments',50]],'연결+의견'),'attention-driver':atLeast('viewsReceived',5000,'누적 조회'),'trust-leader':all([['activeDays',60],['likesReceived',75]],'지속+신뢰'),'content-driver':all([['authoredPosts',40],['viewsReceived',4000]],'콘텐츠+조회'),
  'signature-influencer':all([['likesReceived',300],['viewsReceived',10000],['uniqueResponders',50]],'상징 영향력'),'agenda-leader':all([['itsmePosts',25],['highImpactPosts',10],['responsesReceived',100]],'의제 리더십'),'public-icon':all([['viewsReceived',20000],['likesReceived',250]],'대중 존재감'),'grand-connector':all([['uniqueResponders',75],['engagedThreads',50],['comments',150]],'최상위 연결'),'elite-strategist':all([['activeDays',90],['authoredPosts',60],['likesReceived',200],['participationTypes',4]],'종합 기여'),
  'michael':atLeast('referralsRecruited',1000,'추천 정참시민')
});

export function evaluateBadgeRules(user={},activity={},metrics={}){
  const grantedBadges=[...new Set((activity.grantedBadges||[]).map(String).filter(key=>VALID_BADGE_KEYS.has(key)))];
  const automaticBadges=[...new Set((activity.automaticBadges||[]).map(String).filter(key=>AUTOMATIC_TIERS.has(CATALOG_BY_KEY.get(key)?.tier)))];
  const earned=new Set([...grantedBadges,...automaticBadges]),automatic=new Set(automaticBadges),eligible=new Set(),progress={};
  for(const [key,rule] of Object.entries(BADGE_RULES)){
    progress[key]=rule.progress(metrics);
    if(!rule.test(metrics))continue;
    const tier=CATALOG_BY_KEY.get(key)?.tier;
    if(AUTOMATIC_TIERS.has(tier)){earned.add(key);automatic.add(key);}else eligible.add(key);
  }
  if(String(user.role||'')==='admin')for(const key of VALID_BADGE_KEYS)earned.add(key);
  return {earnedBadges:[...earned],eligibleBadges:[...eligible].filter(key=>!earned.has(key)),grantedBadges,automaticBadges:[...automatic],progress};
}
