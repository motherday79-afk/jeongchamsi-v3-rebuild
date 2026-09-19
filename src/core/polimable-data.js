export const POLIMARBLE_BOARD=Object.freeze([
 {index:0,kind:'start',title:'START',description:'정참시 광장에서 출발합니다.',value:0,icon:'🏁'},
 {index:1,kind:'gain',title:'정책 호응',description:'정책 설명이 시민에게 명확하게 전달됐습니다.',value:140,icon:'👍'},
 {index:2,kind:'gain',title:'지역 행사',description:'지역 행사에서 좋은 반응을 얻었습니다.',value:110,icon:'🎪'},
 {index:3,kind:'loss',title:'메시지 혼선',description:'메시지가 엇갈려 민심이 흔들렸습니다.',value:130,icon:'💬'},
 {index:4,kind:'strategy_card',title:'전략 카드',description:'전략카드를 한 장 획득합니다.',value:0,icon:'🃏'},
 {index:5,kind:'gain',title:'현장 소통',description:'현장 소통이 호응을 얻었습니다.',value:170,icon:'🤝'},
 {index:6,kind:'public_card',title:'민심 카드',description:'예측할 수 없는 민심 이벤트가 발생합니다.',value:0,icon:'💗'},
 {index:7,kind:'choice',title:'운명의 선택',description:'안전한 선택과 승부수 중 하나를 고릅니다.',value:0,icon:'⚖️'},
 {index:8,kind:'percent_loss',title:'민심 이탈',description:'일부 지지 흐름이 이탈했습니다.',value:14,icon:'📉'},
 {index:9,kind:'bonus',title:'깜짝 호재',description:'예상 밖의 긍정적 반응이 이어집니다.',value:260,icon:'✨'},
 {index:10,kind:'loss',title:'준비 부족',description:'현장 준비가 부족해 점수를 잃습니다.',value:170,icon:'🧩'},
 {index:11,kind:'strategy_card',title:'전략 카드',description:'전략카드를 한 장 획득합니다.',value:0,icon:'🃏'},
 {index:12,kind:'safe',title:'정참시 광장',description:'숨을 고르는 안전지대입니다.',value:0,icon:'🏛️'},
 {index:13,kind:'gain',title:'정책 발표',description:'정책 발표가 관심을 끌었습니다.',value:190,icon:'📣'},
 {index:14,kind:'loss',title:'쟁점 발생',description:'예상치 못한 쟁점으로 점수를 잃습니다.',value:190,icon:'⚠️'},
 {index:15,kind:'public_card',title:'민심 카드',description:'민심의 흐름이 바뀝니다.',value:0,icon:'💗'},
 {index:16,kind:'gain',title:'지역 공감',description:'지역 현안에 대한 공감대가 형성됐습니다.',value:150,icon:'📍'},
 {index:17,kind:'loss',title:'논란 확산',description:'가상의 논란이 확산되어 점수를 잃습니다.',value:240,icon:'🌪️'},
 {index:18,kind:'choice',title:'운명의 선택',description:'안전하게 갈지 크게 승부할지 선택합니다.',value:0,icon:'⚖️'},
 {index:19,kind:'gain',title:'언론 호응',description:'메시지가 널리 소개되며 관심이 높아졌습니다.',value:130,icon:'📰'},
 {index:20,kind:'percent_loss',title:'신뢰 흔들림',description:'민심 점수의 일부를 잃습니다.',value:18,icon:'💔'},
 {index:21,kind:'bonus',title:'참여의 시간',description:'시민 참여가 활발해져 큰 보너스를 얻습니다.',value:320,icon:'⭐'},
 {index:22,kind:'strategy_card',title:'전략 카드',description:'전략카드를 한 장 획득합니다.',value:0,icon:'🃏'},
 {index:23,kind:'loss',title:'위기 관리',description:'대응이 늦어 민심 점수가 떨어졌습니다.',value:210,icon:'🚨'}
]);

export const POLIMARBLE_CARDS=Object.freeze({
 SHIELD:{id:'SHIELD',name:'민심 방어권',shortLabel:'방어권',description:'다음 감점 1회를 완전히 막습니다.',icon:'🛡️',rarity:'common'},
 FAVOR_PASS:{id:'FAVOR_PASS',name:'우대권',shortLabel:'우대권',description:'다음 2턴 획득 점수에 30% 보너스.',icon:'🌟',rarity:'common'},
 DOUBLE_GAIN:{id:'DOUBLE_GAIN',name:'호응 2배권',shortLabel:'보너스 ×2',description:'다음 플러스 점수 1회를 2배로 만듭니다.',icon:'⭐',rarity:'rare'},
 HALF_LOSS:{id:'HALF_LOSS',name:'위기관리권',shortLabel:'반감권',description:'다음 감점 1회를 절반으로 줄입니다.',icon:'🧯',rarity:'common'},
 BONUS_DIE:{id:'BONUS_DIE',name:'추가 주사위',shortLabel:'+ DICE',description:'다음 이동 때 주사위를 하나 더 굴립니다.',icon:'🎲',rarity:'rare'},
 RECORD_INSURANCE:{id:'RECORD_INSURANCE',name:'기록 보험',shortLabel:'기록 보험',description:'게임오버 시 최고점의 70%를 기록합니다.',icon:'📜',rarity:'epic'},
 DOUBLE_OR_NOTHING:{id:'DOUBLE_OR_NOTHING',name:'승부수',shortLabel:'승부수',description:'다음 3번 점수 변화가 +/− 모두 2배.',icon:'⚡',rarity:'epic'}
});

export const POLIMARBLE_BOARD_POSITIONS=Object.freeze([
 [7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[7,7],
 [6,7],[5,7],[4,7],[3,7],[2,7],
 [1,7],[1,6],[1,5],[1,4],[1,3],[1,2],[1,1],
 [2,1],[3,1],[4,1],[5,1],[6,1]
]);
