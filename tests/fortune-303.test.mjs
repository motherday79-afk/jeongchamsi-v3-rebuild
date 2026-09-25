import test from 'node:test';
import assert from 'node:assert/strict';
import {renderFortuneCard} from '../src/layout/home-layout.js';

const fortune={ok:true,date:'2026-09-25',overall:{score:82,title:'좋은 흐름을 만드는 날',summary:'작은 선택이 하루의 방향을 만듭니다.'},money:{score:76,summary:'계획한 지출부터 차분히 확인해 보세요.'},business:{score:84,summary:'먼저 꺼낸 제안이 좋은 연결을 만듭니다.'},relationship:{score:79,summary:'짧은 안부가 관계의 온도를 높입니다.'}};

test('daily fortune result is rendered as a return-worthy ritual card',()=>{
 const html=renderFortuneCard(fortune,{authenticated:true,user:{id:'member'}});
 assert.match(html,/fortune-ritual/);assert.match(html,/오늘의 한마디/);assert.match(html,/내일 00:00에 새로운 운세가 열려요/);assert.match(html,/fortune-guidance/);assert.match(html,/금전 흐름/);assert.match(html,/사업 흐름/);assert.match(html,/관계 흐름/);
});
