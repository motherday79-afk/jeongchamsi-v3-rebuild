import { ADDITIONAL_NON_INCUMBENT_PHOTOS } from './non-incumbent-photos.js';
// Editorial roster; stored profiles and administrator photo overrides win.
const verifiedAt='2026-09-28';
const pmSource='https://www.opm.go.kr/opm/prime/past-oversea.do';
const records=[
 {name:'홍준표',party:'',office:'전 대구광역시장',terms:'전 경상남도지사 · 전 국회의원',source:'대구광역시·공개 정치 경력',sourceUrl:'https://www.daegu.go.kr/',careers:['대구광역시장','경상남도지사','국회의원']},
 {name:'김문수',party:'국민의힘',office:'전 고용노동부 장관',terms:'전 경기도지사 · 전 국회의원',source:'고용노동부 역대 장관소개',sourceUrl:'https://www.moel.go.kr/cyber/intro/hist/view.do?seq=66',careers:['고용노동부 장관','경기도지사','국회의원']},
 {name:'이낙연',party:'새미래민주당',office:'전 국무총리',terms:'제45대 국무총리 · 전 전라남도지사',source:'국무조정실 역대총리소개·새미래민주당',sourceUrl:pmSource,careers:['제45대 국무총리','전라남도지사','국회의원']},
 {name:'황교안',party:'자유와혁신',office:'자유와혁신 대표',terms:'제44대 국무총리 · 전 법무부 장관',source:'국무조정실 역대총리소개',sourceUrl:pmSource,careers:['제44대 국무총리','법무부 장관']},
 {name:'유승민',party:'국민의힘',office:'전 국회의원',terms:'전 바른정당 대표 · 제17~20대 국회의원',source:'연합뉴스 · 공개 정치 경력',sourceUrl:'https://www.yna.co.kr/amp/view/AKR20260805073000001',careers:['제17~20대 국회의원','바른정당 대표']},
 {name:'김부겸',party:'더불어민주당',office:'전 국무총리',terms:'제47대 국무총리 · 전 행정안전부 장관',source:'국무조정실 역대총리소개',sourceUrl:pmSource,careers:['제47대 국무총리','행정안전부 장관','국회의원']},
 {name:'원희룡',party:'국민의힘',office:'전 국토교통부 장관',terms:'전 제주특별자치도지사 · 전 국회의원',source:'연합뉴스 · 공개 정치 경력',sourceUrl:'https://www.yna.co.kr/amp/view/AKR20260812146400004',careers:['국토교통부 장관','제주특별자치도지사','국회의원']},
 {name:'조국',party:'조국혁신당',office:'전 법무부 장관',terms:'전 국회의원 · 전 조국혁신당 대표',source:'동아일보 · 공개 정치 경력',sourceUrl:'https://www.donga.com/news/Politics/article/all/20260904/134603258/2',careers:['법무부 장관','국회의원','조국혁신당 대표']},
 {name:'윤희숙',party:'국민의힘',office:'전 국회의원',terms:'제21대 국회의원 · 전 여의도연구원장',source:'공개 정치 경력 · 2026년 출마 보도',sourceUrl:'https://v.daum.net/v/20260306112746540',careers:['제21대 국회의원','여의도연구원장']},
 {name:'양향자',party:'국민의힘',office:'전 국회의원',terms:'제21대 국회의원 · 전 한국의희망 대표',source:'공개 정치 경력 · 2026년 경기지사 선거 보도',sourceUrl:'https://v.daum.net/v/20260603234938538',careers:['제21대 국회의원','한국의희망 대표']},
 {name:'조응천',party:'개혁신당',office:'전 국회의원',terms:'제20·21대 국회의원',source:'뉴스1 · 공개 정치 경력',sourceUrl:'https://news.nate.com/view/20260604n26336',careers:['제20·21대 국회의원']},
 {name:'금태섭',party:'',office:'전 국회의원',terms:'제20대 국회의원 · 전 새로운선택 공동대표',source:'CBS · 공개 정치 경력',sourceUrl:'https://m.nocutnews.co.kr/news/6553192',careers:['제20대 국회의원','새로운선택 공동대표']}
];
export const NON_INCUMBENT_POLITICIANS=Object.freeze(records.map(({careers,...person},i)=>({
 ...person,id:`nonincumbent-${String(i+1).padStart(3,'0')}`,slot:i+1,type:'nonincumbent',roleLabel:'비현직 정치인',groupLabel:'비현직 정치인',connected:true,isVacant:false,
 region:'',jurisdiction:'',jurisdictionLabel:'주요 활동',termStart:'',termEnd:'',committee:'',electionLabel:'',verifiedAt,
 currentRoles:person.name==='황교안'?[{title:person.office,roleStatus:'appointed',verifiedAt}]:[],
 roleHistory:careers.map(title=>({title,roleStatus:'ended',sourceUrl:person.sourceUrl,sourceLabel:person.source,verifiedAt}))
})));

export const NON_INCUMBENT_PHOTOS=Object.freeze({...Object.fromEntries(NON_INCUMBENT_POLITICIANS.slice(0,4).map((person,i)=>[person.id,{
 id:person.id,localPath:`/assets/politicians/${person.id}.${i<2?'jpg':'png'}`,focus:'50% 28%',verified:true,sourceType:'official-profile',
 sourcePage:i===0?"https://commons.wikimedia.org/wiki/File:Hong_Jun-pyo%27s_Portrait_(2020).jpg":person.sourceUrl,
 attribution:i===0?'대한민국 국회 · 공공누리 제1유형':i===1?'고용노동부':'국무조정실·국무총리비서실'
}])),...ADDITIONAL_NON_INCUMBENT_PHOTOS});
