export const DMZ_EPISODE={
 id:'dmz-20260921',number:1,title:'DMZ 지뢰 사건, 무엇이 확인됐나',
 summary:'사고 발생부터 합동조사와 유엔사의 판단까지. 복잡한 이슈의 흐름을 네 장면으로 읽습니다.',
 category:'안보 · 남북관계',date:'2026-09-30',published:true,
 format:'comic',image:'/assets/webtoons/dmz-comic-369.webp',
 panels:[
  {title:'DMZ에서 발생한 사고',text:'9월 21일, DMZ에서 작전 중이던 우리 장병 3명이 지뢰 폭발로 다쳤습니다. 군은 사고 경위와 지뢰의 출처를 조사하기 시작했습니다.',alt:'숲속 DMZ 길을 이동하는 장병들과 멀리 피어오른 먼지. 사고 상황을 재구성한 그림.'},
  {title:'한국군·유엔사 합동조사',text:'한국군과 유엔사는 현장을 함께 조사했습니다. 추측을 앞세우기보다, 현장에서 발견한 증거를 확인하는 과정이 이어졌습니다.',alt:'통제된 숲길에서 현장 기록을 확인하는 조사 인원들.'},
  {title:'북한 지뢰가 발견됐다',text:'합동조사에서 군사분계선 남쪽의 북한제 대인지뢰가 확인됐습니다. 발견된 지뢰와 조사 결과가 사건 판단의 핵심 근거가 됐습니다.',alt:'현장 사진과 조사 기록을 살펴보는 모습을 상징한 그림.'},
  {title:'유엔사 “정전협정 위반”',text:'9월 30일, 유엔사는 조사 결과를 근거로 정전협정 위반이라고 밝혔습니다. 확인된 결과와 정확한 매설 시점 등 추가 확인이 필요한 사항은 구분해서 봐야 합니다.',alt:'취재진을 향해 조사 결과를 설명하는 가상의 군 브리핑 장면.'}
 ],
 takeaway:'장병 부상 → 합동 현장조사 → 북한 지뢰 확인 → 유엔사의 정전협정 위반 판단. 발표 시점에 따라 확인된 정보가 달라졌다는 것이 핵심입니다.',
 sources:[
  {label:'국방부 정례브리핑 · 9월 28일',url:'https://m.korea.kr/briefing/policyBriefingView.do?newsId=156783378'},
  {label:'연합뉴스 · DMZ 지뢰 폭발 보도 · 9월 21일',url:'https://www.yna.co.kr/view/AKR20260921095652504'},
  {label:'KBS WORLD · 유엔사 조사 결과 발표 · 9월 30일',url:'https://world.kbs.co.kr/special/northkorea/contents/news/news_view.htm?No=204563&lang=e'}
 ],updatedAt:'2026-09-30T15:00:00.000Z'
};

const episode=(id,number,title,image,scenes,sources)=>({
 id,number,title,image:'/assets/webtoons/'+image,date:'2026-10-01',published:true,format:'comic',
 panels:scenes.map(([title,text])=>({title,text,alt:title+'. '+text})),sources,
 updatedAt:'2026-10-01T00:00:00.000Z'
});
export const COMIC_EPISODES=[DMZ_EPISODE,
 episode('prosecution-reform-20261001',2,'검찰청 폐지와 중수청·공소청 출범','prosecution-reform-373.webp',[
  ['검찰청 폐지, 무엇이 달라질까?','내 사건은 누가 수사하고, 누가 재판에 넘기죠?'],
  ['수사는 수사기관이','경찰과 중수청 등이 맡아요. 중수청은 중대범죄를 수사하죠.'],
  ['기소와 공소유지는 공소청','수사 결과를 보고 재판에 넘길지 판단하고, 법정에서 공소를 유지해요.'],
  ['2026년 10월 2일 출범 예정','수사와 기소의 역할이 나뉘는 거군요! 진행 중인 사건은 담당 기관의 안내를 확인하세요.']
 ],[
  {label:'정부 국정과제 추진 실적 · 수사와 기소 분리',url:'https://www.archives.go.kr/next/common/downloadBoardFile.do?board_file_seq=1&board_seq=103208'},
  {label:'행정안전부 · 중수청 출범 준비',url:'https://m.korea.kr/briefing/pressReleaseView.do?newsId=156781718&pWise=mSub&pWiseSub=C4'}
 ]),
 episode('trial-request-20261001',3,'추경호 재판에서 특검이 징역 20년 구형','trial-request-373.webp',[
  ['추경호 재판, 특검이 징역 20년 구형','20년을 선고받았다는 뜻이야?'],
  ['구형은 특검의 요청','아니에요. 이 정도 형을 내려 달라고 재판부에 요청한 거예요.'],
  ['선고는 법원의 판단','재판부가 증거와 양쪽 주장을 살펴 판결해요. 구형과 같을 수도, 다를 수도 있죠.'],
  ['구형과 선고는 다릅니다','그럼 아직 판결을 기다려야겠네! 맞아요. 구형만으로 유죄나 형량이 확정되지는 않아요.']
 ],[{label:'연합뉴스 · 2026년 9월 30일 구형 보도',url:'https://www.yna.co.kr/view/AKR20260930134051004'}]),
 episode('mortgage-rates-20261001',4,'주택담보대출 금리, 넉 달 연속 상승','mortgage-rates-373.webp',[
  ['주택담보대출 금리, 넉 달 연속 상승','집을 사려고 알아봤는데, 대출이자가 또 올랐네?'],
  ['한국은행 2026년 8월 통계','새로 받은 주택담보대출의 평균 금리예요. 모두의 금리가 똑같이 오르는 건 아니에요.'],
  ['내 대출 조건은 따로 확인!','고정금리인지 변동금리인지, 금리가 언제 바뀌는지에 따라 달라요.'],
  ['집값만 보면 놓치는 비용','매달 갚을 원금과 이자까지 계산해야겠네. 맞아요. 금리가 더 올라도 감당할 수 있는지 살펴보세요.']
 ],[
  {label:'한국은행 · 2026년 8월 금융기관 가중평균금리 (KDI 수록)',url:'https://eiec.kdi.re.kr/policy/materialView.do?num=287550&pg=&pp=20&topic=L'},
  {label:'매일경제 · 2026년 9월 30일 주택담보대출 금리 보도',url:'https://m.mk.co.kr/news/business/12164989'}
 ])
];
