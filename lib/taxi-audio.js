import {createHash} from 'node:crypto';
const femaleIds=new Set(['taxi-01','taxi-06','taxi-11','taxi-12']);
export const GREETING_LINES=[
 "안녕하세요, 기사님. 이른 시간부터 운행하고 계시네요. 식사는 챙겨 드셨어요? 오늘도 편안한 하루가 되셨으면 좋겠어요. 제가 나누고 싶은 이야기가 있는데, 한번 들어주시겠습니까?",
 "기사님, 안녕하세요. 아직 거리가 조용하네요. 이렇게 하루를 시작하니 마음도 조금 차분해지는 것 같아요. 괜찮으시면 가는 동안 제 이야기를 한번 들어주시겠습니까?",
 "안녕하세요, 기사님. 반갑습니다. 오늘은 손님을 많이 만나셨나요? 서두르지 않으셔도 괜찮아요. 가는 동안 제가 하고 싶은 이야기가 있는데, 잠깐 들어주시겠습니까?",
 "안녕하세요, 기사님. 오늘도 운전하시느라 고생이 많으세요. 잠깐이라도 쉬어 가며 일하셨으면 좋겠네요. 제가 나누고 싶은 이야기가 있는데, 괜찮으시면 한번 들어주시겠습니까?"
];
export function greetingAudio(p,index=0){const text=GREETING_LINES[index%GREETING_LINES.length];return {index:0,text,type:'game_intro',audioUrl:audioUrl(text,taxiVoice(p))};}
const voiceAssignments={'taxi-01':'F3','taxi-03':'M2','taxi-04':'M3','taxi-05':'M3','taxi-08':'M2','taxi-09':'M3','taxi-11':'F2','taxi-12':'F2','taxi-13':'M3','taxi-14':'M1','taxi-15':'M3','taxi-16':'M2','taxi-17':'M1','taxi-18':'M3','taxi-19':'M1','taxi-20':'M3','taxi-21':'F3','taxi-22':'F2'};
export const taxiVoice=p=>voiceAssignments[p.id]||(femaleIds.has(p.id)?'F1':'M1');
export function audioUrl(text,voice,edition='474-supertonic3'){return '/assets/taxi/audio/'+createHash('sha256').update(edition+'|'+voice+'|'+text).digest('hex').slice(0,32)+'.mp3';}
export const CHOICE_LINES=[
 "기사님, 제 이야기는 어떠셨어요? 마음에 드셨다면 공감으로 응원해 주세요. 아직 나누고 싶은 이야기가 좀 더 있는데, 조금만 더 태워 주실래요? 기사님과 다음 이야기도 나눠 보고 싶어요. 혹시 생각이 다르시거나 여기까지만 듣고 싶으시면, 제가 여기서 내려도 괜찮아요. 편하게 선택해 주세요. 저는 기사님의 선택을 존중하니까요.",
 "제 이야기를 들어주셔서 고마워요, 기사님. 마음이 닿는 부분이 있었다면 공감으로 알려 주시면 기쁠 것 같아요. 괜찮으시면 조금 더 가 주실래요? 가는 동안 다음 이야기도 들려드리고 싶거든요. 물론 생각이 다르시거나 더 듣고 싶지 않으시면 여기서 내려주셔도 좋아요. 천천히 생각하셔도 돼요. 저는 기사님의 선택을 존중하니까요.",
 "기사님은 어떻게 생각하세요? 제 생각이 마음에 드셨다면 공감으로 응원해 주세요. 이렇게 함께 가면서 이야기를 나누니 좋네요. 아직 못다 한 이야기가 있는데, 조금만 더 함께해 주실래요? 혹시 제 생각과 다르시거나 여기까지만 듣고 싶으시면 제가 내릴게요. 부담 없이 말씀해 주세요. 저는 기사님의 선택을 존중하니까요.",
 "여기까지 함께해 주셔서 고마워요, 기사님. 제 이야기에 고개가 끄덕여지셨다면 공감으로 마음을 전해 주세요. 이제 나누고 싶은 이야기가 하나 더 남았는데, 조금 더 운행해 주실래요? 아니면 제가 여기서 내릴까요? 생각이 다르셔도 괜찮고, 더 듣고 싶지 않으셔도 괜찮아요. 편하게 선택해 주세요. 저는 기사님의 선택을 존중하니까요."
];
export const FINAL_CHOICE_LINE="이야기하다 보니 어느새 여기까지 왔네요. 끝까지 들어주셔서 고마워요, 기사님. 마지막 이야기도 마음에 드셨다면 공감으로 응원해 주세요. 이제 여기서 운행을 마치고 인사드려도 될까요? 내리기 전에 제가 누구인지도 말씀드리고 싶어요. 생각이 다르셨더라도 편하게 내려주셔도 괜찮아요. 저는 기사님의 선택을 존중하니까요.";
export function beatAudio(p,index){const voice=taxiVoice(p),last=index===p.beats.length-1,text=last?FINAL_CHOICE_LINE:CHOICE_LINES[index%CHOICE_LINES.length],url=audioUrl(p.beats[index].text,voice);return {audioUrl:url,timingsUrl:url.replace('.mp3','.json'),comfort:{text,kind:last?'closing':'comfort',audioUrl:audioUrl(text,voice)}};}
