import { GOVERNMENT_PEOPLE, GOVERNMENT_VERIFIED_AT } from './government-people.js?v=0.0.31.489';
export const GOVERNMENT_SEED=Object.freeze({
  verifiedAt:GOVERNMENT_VERIFIED_AT,sourceLabel:'대한민국 청와대·정책브리핑 공식 공개자료 기준',
  profile:Object.freeze({id:'government-001',name:'이재명',office:'대한민국 제21대 대통령',party:'더불어민주당 출신',birth:'1964.12.22',education:'중앙대학교 법학과',inauguratedAt:'2025.06.04',term:'2025.06.04 ~ 2030.06.03'}),
  career:Object.freeze(['민선 5·6기 성남시장','제35대 경기도지사','제21·22대 국회의원','더불어민주당 당대표','2025년 제21대 대통령선거 당선','2025년 6월 4일 대한민국 제21대 대통령 취임']),
  elections:Object.freeze(['2010년 제5회 전국동시지방선거 성남시장 당선','2014년 제6회 전국동시지방선거 성남시장 재선','2018년 제7회 전국동시지방선거 경기도지사 당선','2022년 국회의원 보궐선거 인천 계양을 당선','2024년 제22대 국회의원선거 인천 계양을 당선','2025년 제21대 대통령선거 당선']),
  vision:'국민이 주인인 나라를 바탕으로 통합과 참여의 정치, 혁신경제, 균형성장, 튼튼한 사회안전망, 국익 중심의 외교안보를 추진하는 국민주권정부',
  policies:Object.freeze(['AI 3대 강국 도약과 과학기술·첨단산업 경쟁력 강화','주력산업 혁신과 신산업 규제 재설계를 통한 성장동력 확대','자치분권과 다극형 균형성장, 지역 전략산업 육성','소상공인·골목상권 회복과 생산적 금융 강화','재난·산업재해 예방과 국민 생명·안전 보호','K-컬처·관광·콘텐츠 산업의 국가전략산업화','국익 중심 실용외교와 경제안보·통상 대응 강화']),
  pledges:Object.freeze(['국민 주권 의사가 일상적으로 국정에 반영되는 참여형 정부','민생 회복과 지속가능한 성장 기반 확충','수도권 1극 체제를 넘어서는 균형발전','AI·반도체 등 미래산업에 대한 국가 투자 확대','사회적 약자를 보호하는 기본이 튼튼한 사회']),
  nationalTasks:Object.freeze(['국민이 하나되는 정치','세계를 이끄는 혁신경제','모두가 잘사는 균형경제','기본이 튼튼한 사회','국익 중심의 외교안보']),
  leadership:Object.freeze(GOVERNMENT_PEOPLE.filter(person=>person.section==='leadership').map(person=>({...person,note:'공식 공개자료 확인'}))),
  cabinet:Object.freeze(GOVERNMENT_PEOPLE.filter(person=>person.section==='cabinet'))
});
