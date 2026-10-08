import {createHash} from 'node:crypto';
const femaleIds=new Set(['taxi-01','taxi-06','taxi-11','taxi-12']);
export const COMFORT_LINES=[
 '제가 말을 좀 길게 했죠? 들어주셔서 고맙습니다, 기사님. 생각이 다르셔도 괜찮아요. 서두르지 마시고, 빗소리 들으면서 편하게 골라 주세요.',
 '기사님, 제 얘기 들어주셔서 고맙습니다. 꼭 같은 생각이실 필요는 없어요. 아직 잘 모르겠으셔도 괜찮고요. 천천히 생각해 보시고, 편하게 선택해 주세요.',
 '이런 얘기는 한 번 듣고 바로 답하기 어렵죠. 괜찮습니다, 기사님. 잠깐 빗소리 들으면서 쉬어 가요. 준비되시면 그때 편하게 선택해 주셔도 돼요.',
 '가만히 들어주셔서 고맙네요, 기사님. 제 생각은 그렇다는 얘기예요. 다르게 느끼셔도 괜찮습니다. 조금 더 생각해 보시고, 마음 편하게 골라 주세요.'
];
export const CLOSING_LINES=[
 '어느새 이야기를 다 했네요. 여기까지 들어주셔서 고맙습니다, 기사님. 생각이 같아도, 달라도 괜찮아요. 잠깐 쉬셨다가, 마지막 선택은 편하게 해 주세요.',
 '제가 하고 싶었던 얘기는 여기까지예요. 함께 와 주셔서 고맙습니다, 기사님. 바로 답하지 않으셔도 돼요. 빗소리 들으면서, 천천히 생각해 주세요.',
 '이야기하다 보니 시간이 훌쩍 갔네요. 잘 들어주셔서 고맙습니다, 기사님. 꼭 동의하실 필요는 없어요. 어떤 생각이 드셨는지, 편한 마음으로 골라 주세요.',
 '긴 얘기 들어주시느라 고생하셨어요, 기사님. 덕분에 편하게 말했네요. 이제 잠깐 쉬어 가요. 제 말에 맞추려 하지 마시고, 마음 가는 대로 선택해 주세요.'
];
export const GREETING_LINES=[
 '안녕하세요, 기사님. 비가 제법 오네요. 오늘 손님은 좀 있으셨어요? 빗소리를 들으니 마음이 차분해지네요. 제가 나누고 싶은 이야기가 있는데, 한번 들어주시겠습니까?',
 '안녕하세요, 기사님. 비 오는 밤이라 길이 많이 미끄럽죠? 천천히 가 주셔도 괜찮습니다. 가는 동안 제가 하고 싶은 이야기가 있는데, 한번 들어주시겠습니까?',
 '기사님, 안녕하세요. 덕분에 비를 피했네요. 이런 날에는 따뜻한 차 한 잔이 생각나지 않으세요? 괜찮으시면 가는 동안 제 이야기를 잠깐 들어주시겠습니까?',
 '안녕하세요, 기사님. 오늘도 늦게까지 운행하시네요. 식사는 챙겨 드셨어요? 빗소리가 참 좋네요. 제가 나누고 싶은 이야기가 있는데, 한번 들어주시겠습니까?'
];
export function greetingAudio(p,index=0){const text=GREETING_LINES[index%GREETING_LINES.length];return {index:0,text,type:'game_intro',audioUrl:audioUrl(text,taxiVoice(p))};}
export const taxiVoice=p=>femaleIds.has(p.id)?'F1':'M1';
export function audioUrl(text,voice,edition='474-supertonic3'){return '/assets/taxi/audio/'+createHash('sha256').update(edition+'|'+voice+'|'+text).digest('hex').slice(0,32)+'.mp3';}
export function beatAudio(p,index){const voice=taxiVoice(p),last=index===p.beats.length-1,lines=last?CLOSING_LINES:COMFORT_LINES,text=lines[(Number(p.id.split('-')[1])||1)%lines.length],url=audioUrl(p.beats[index].text,voice);return {audioUrl:url,timingsUrl:url.replace('.mp3','.json'),...(index===0||last?{comfort:{text,kind:last?'closing':'comfort',audioUrl:audioUrl(text,voice)}}:{})};}
