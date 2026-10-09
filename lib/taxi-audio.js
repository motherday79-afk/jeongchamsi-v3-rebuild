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
 "기사님, 제 생각은 어떠셨어요? 마음에 드셨다면 공감하기로 마음을 남겨 주세요. 공감하신 뒤에도 계속 듣거나 여기서 내려주실 수 있어요. 다음 이야기가 궁금하시면 계속 듣기를, 생각이 다르거나 여기까지만 듣고 싶으시면 내려주기를 눌러 주세요. 어떤 선택이든 괜찮습니다. 저는 기사님의 선택을 존중하니까요.",
 "여기까지 들어주셔서 고맙습니다, 기사님. 제 이야기에 동의하셨다면 공감하기를 눌러 마음을 남겨 주세요. 공감하기는 다음 이야기로 넘어가는 버튼은 아니에요. 조금 더 들어보고 싶으시면 계속 듣기를, 그만 듣고 싶으시면 내려주기를 눌러 주세요. 천천히 생각하셔도 좋아요. 저는 기사님의 선택을 존중하니까요.",
 "기사님은 어떻게 생각하세요? 제 의견이 마음에 드셨다면 공감하기로 알려 주시면 좋겠어요. 공감한 뒤에도 다음 이야기를 듣거나 내려주실 수 있습니다. 다음 생각이 궁금하시면 계속 듣기를, 생각이 다르거나 더 듣고 싶지 않으시면 내려주기를 눌러 주세요. 편하게 선택해 주세요. 저는 기사님의 선택을 존중하니까요.",
 "제 이야기를 차분히 들어주셔서 고맙네요. 마음이 닿는 부분이 있었다면 공감하기를 눌러 주세요. 공감은 마음을 남기는 선택이고, 다음 이야기로 가시려면 계속 듣기를 눌러 주시면 돼요. 여기까지만 함께하고 싶으시면 내려주기를 선택하셔도 괜찮습니다. 부담 갖지 않으셔도 돼요. 저는 기사님의 선택을 존중하니까요."
];
export const FINAL_CHOICE_LINE="다섯 가지 이야기를 모두 들어주셔서 고맙습니다, 기사님. 마지막 이야기가 마음에 드셨다면 공감하기로 마음을 남겨 주세요. 공감한 뒤 운행 마치기를 누르시면 제가 누구인지 함께 보실 수 있어요. 생각이 다르셨거나 여기서 내려주고 싶으시면 내려주기를 선택하셔도 됩니다. 어떤 선택이든 괜찮습니다. 저는 기사님의 선택을 존중하니까요.";
export function beatAudio(p,index){const voice=taxiVoice(p),last=index===p.beats.length-1,text=last?FINAL_CHOICE_LINE:CHOICE_LINES[index%CHOICE_LINES.length],url=audioUrl(p.beats[index].text,voice);return {audioUrl:url,timingsUrl:url.replace('.mp3','.json'),comfort:{text,kind:last?'closing':'comfort',audioUrl:audioUrl(text,voice)}};}
