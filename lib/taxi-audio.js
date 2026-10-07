import {createHash} from 'node:crypto';
const femaleIds=new Set(['taxi-01','taxi-06','taxi-11','taxi-12']);
export const COMFORT_LINES=['기사님 생각은 다를 수도 있죠. 편하게 선택해 주세요.','천천히 생각하셔도 괜찮습니다.','제 이야기는 여기까지예요. 어떤 선택이든 존중합니다.','꼭 동의하지 않으셔도 괜찮아요.'];
export const GREETING_LINES=[
 '안녕하세요, 기사님. 비가 제법 오네요. 오늘 손님은 좀 있으셨어요? 빗소리를 들으니 마음이 차분해지네요. 제가 나누고 싶은 이야기가 있는데, 한번 들어주시겠습니까?',
 '안녕하세요, 기사님. 비 오는 밤이라 길이 많이 미끄럽죠? 천천히 가 주셔도 괜찮습니다. 가는 동안 제가 하고 싶은 이야기가 있는데, 한번 들어주시겠습니까?',
 '기사님, 안녕하세요. 덕분에 비를 피했네요. 이런 날에는 따뜻한 차 한 잔이 생각나지 않으세요? 괜찮으시면 가는 동안 제 이야기를 잠깐 들어주시겠습니까?',
 '안녕하세요, 기사님. 오늘도 늦게까지 운행하시네요. 식사는 챙겨 드셨어요? 빗소리가 참 좋네요. 제가 나누고 싶은 이야기가 있는데, 한번 들어주시겠습니까?'
];
export function greetingAudio(p,index=0){const text=GREETING_LINES[index%GREETING_LINES.length];return {index:0,text,type:'game_intro',audioUrl:audioUrl(text,taxiVoice(p))};}
export const taxiVoice=p=>femaleIds.has(p.id)?'ko-KR-SunHiNeural':'ko-KR-InJoonNeural';
export function audioUrl(text,voice){return '/assets/taxi/audio/'+createHash('sha256').update('466|'+voice+'|'+text).digest('hex').slice(0,32)+'.mp3';}
export function beatAudio(p,index){const voice=taxiVoice(p),text=COMFORT_LINES[(Number(p.id.split('-')[1])||1)%COMFORT_LINES.length],url=audioUrl(p.beats[index].text,voice);return {audioUrl:url,timingsUrl:url.replace('.mp3','.json'),...(index===0?{comfort:{text,audioUrl:audioUrl(text,voice)}}:{})};}
