// Initial editorial roster; stored profiles and administrator photo overrides win.
const verifiedAt='2026-09-28';
const pmSource='https://www.opm.go.kr/opm/prime/past-oversea.do';
const records=[
 {name:'홍준표',party:'',office:'전 대구광역시장',terms:'전 경상남도지사 · 전 국회의원',source:'대구광역시·공개 정치 경력',sourceUrl:'https://www.daegu.go.kr/',careers:['대구광역시장','경상남도지사','국회의원']},
 {name:'김문수',party:'국민의힘',office:'전 고용노동부 장관',terms:'전 경기도지사 · 전 국회의원',source:'고용노동부 역대 장관소개',sourceUrl:'https://www.moel.go.kr/cyber/intro/hist/view.do?seq=66',careers:['고용노동부 장관','경기도지사','국회의원']},
 {name:'이낙연',party:'새미래민주당',office:'전 국무총리',terms:'제45대 국무총리 · 전 전라남도지사',source:'국무조정실 역대총리소개·새미래민주당',sourceUrl:pmSource,careers:['제45대 국무총리','전라남도지사','국회의원']},
 {name:'황교안',party:'자유와혁신',office:'자유와혁신 대표',terms:'제44대 국무총리 · 전 법무부 장관',source:'국무조정실 역대총리소개',sourceUrl:pmSource,careers:['제44대 국무총리','법무부 장관']}
];
export const NON_INCUMBENT_POLITICIANS=Object.freeze(records.map(({careers,...person},i)=>({
 ...person,id:`nonincumbent-${String(i+1).padStart(3,'0')}`,slot:i+1,type:'nonincumbent',roleLabel:'비현직 정치인',groupLabel:'비현직 정치인',connected:true,isVacant:false,
 region:'',jurisdiction:'',jurisdictionLabel:'주요 활동',termStart:'',termEnd:'',committee:'',electionLabel:'',verifiedAt,
 currentRoles:person.name==='황교안'?[{title:person.office,roleStatus:'appointed',verifiedAt}]:[],
 roleHistory:careers.map(title=>({title,roleStatus:'ended',sourceUrl:person.sourceUrl,sourceLabel:person.source,verifiedAt}))
})));

export const NON_INCUMBENT_PHOTOS=Object.freeze(Object.fromEntries(NON_INCUMBENT_POLITICIANS.map((person,i)=>[person.id,{
 id:person.id,localPath:`/assets/politicians/${person.id}.${i<2?'jpg':'png'}`,focus:'50% 28%',verified:true,sourceType:'official-profile',
 sourcePage:i===0?"https://commons.wikimedia.org/wiki/File:Hong_Jun-pyo%27s_Portrait_(2020).jpg":person.sourceUrl,
 attribution:i===0?'대한민국 국회 · 공공누리 제1유형':i===1?'고용노동부':'국무조정실·국무총리비서실'
}])));
