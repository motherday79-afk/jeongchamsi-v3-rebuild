import {createHash} from 'node:crypto';
const femaleIds=new Set(['taxi-01','taxi-06','taxi-11','taxi-12']);
export const COMFORT_LINES=['기사님 생각은 다를 수도 있죠. 편하게 선택해 주세요.','천천히 생각하셔도 괜찮습니다.','제 이야기는 여기까지예요. 어떤 선택이든 존중합니다.','꼭 동의하지 않으셔도 괜찮아요.'];
export const taxiVoice=p=>femaleIds.has(p.id)?'ko-KR-SunHiNeural':'ko-KR-InJoonNeural';
export function audioUrl(text,voice){return '/assets/taxi/audio/'+createHash('sha256').update('466|'+voice+'|'+text).digest('hex').slice(0,32)+'.mp3';}
export function beatAudio(p,index){const voice=taxiVoice(p),text=COMFORT_LINES[(Number(p.id.split('-')[1])||1)%COMFORT_LINES.length];return {audioUrl:audioUrl(p.beats[index].text,voice),...(index===0?{comfort:{text,audioUrl:audioUrl(text,voice)}}:{})};}
