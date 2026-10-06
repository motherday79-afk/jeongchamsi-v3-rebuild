// Party identifiers are game teams; actions express no real-world policy judgment.
export const TERRITORY_PARTIES = [
  {id:'democratic',name:'더불어민주당',color:'#245cce'},
  {id:'ppp',name:'국민의힘',color:'#d83c4b'},
  {id:'rebuilding',name:'조국혁신당',color:'#164a86'},
  {id:'reform',name:'개혁신당',color:'#e8791c'},
  {id:'progressive',name:'진보당',color:'#ac2259'},
  {id:'basic',name:'기본소득당',color:'#137f79'},
  {id:'social',name:'사회민주당',color:'#b46427'},
];
export const TERRITORY_OFFICES = [
  {id:'policy',name:'정책실',description:'법안 발의와 수정안의 영향력이 증가합니다.'},
  {id:'media',name:'홍보실',description:'기자회견과 반론의 영향력이 증가합니다.'},
  {id:'research',name:'조사실',description:'검증 요청과 자료 공개의 영향력이 증가합니다.'},
];
export const TERRITORY_MOVES = [
  {id:'bill',name:'법안 발의',officeId:'policy',role:'challenge',description:'우리 정당의 영향력을 높입니다.'},
  {id:'media',name:'기자회견',officeId:'media',role:'challenge',description:'우리 정당의 영향력을 높입니다.'},
  {id:'scrutiny',name:'검증 요청',officeId:'research',role:'challenge',description:'영향력을 높이고 선두 경쟁 정당의 영향력을 낮춥니다.'},
  {id:'amendment',name:'수정안 제출',officeId:'policy',role:'defend',description:'영향력을 높이고 선두 도전 정당의 영향력을 낮춥니다.'},
  {id:'rebuttal',name:'반론 발표',officeId:'media',role:'defend',description:'영향력을 높이고 선두 도전 정당의 영향력을 낮춥니다.'},
  {id:'disclosure',name:'자료 공개',officeId:'research',role:'defend',description:'영향력을 높이고 선두 도전 정당의 영향력을 낮춥니다.'},
];
export const TERRITORY_RULES = Object.freeze({captureThreshold:600,leaderMargin:100,holdMs:300000,protectionMs:600000,maxScore:2000,maxEnergy:100,energyRegenMs:300000,actionEnergy:10,actionPoints:20,cooldownMs:10000,maxOfficeLevel:5,upgradeBasePoints:100});
