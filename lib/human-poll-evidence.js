// Reviewed against the original cross-tab PDFs on 2026-09-28.
// This is a dated evidence supplement, NOT a fallback for a different/new survey.
const bucket=(n,weightedN,positive,negative,undecided)=>({n,weightedN,positive,negative,undecided,status:Object.fromEntries(Object.entries({n,weightedN,positive,negative,undecided}).map(([k,v])=>[k,v==null?'not_provided':'verified']))});
const rows=values=>Object.fromEntries(values.map(([name,...v])=>[name,bucket(...v)]));
export const VERIFIED_HUMAN_REPORTS=[{
 institution:'한국갤럽',topic:'presidential-approval',startDate:'2026-09-15',endDate:'2026-09-17',publishedDate:'2026-09-18',sampleSize:1002,
 sourceUrl:'https://www.gallup.co.kr/gallupdb/reportContent.asp?seqNo=1659',
 title:'한국갤럽 데일리 오피니언 제676호 · 대통령 직무 수행 평가',commissioner:'한국갤럽 자체 조사',method:'무선전화 가상번호 · 전화조사원 인터뷰(CATI)',responseRate:9.8,marginOfError:3.1,
 question:'귀하는 요즘 이재명 대통령이 대통령으로서의 직무를 잘 수행하고 있다고 보십니까, 아니면 잘못 수행하고 있다고 보십니까? (긍정/부정을 답하지 않은 경우 재질문) 굳이 말씀하신다면, ‘잘하고 있다’와 ‘잘못하고 있다’ 중 어느 쪽입니까?',
 evidence:{url:'https://www.gallup.co.kr/dir/GallupKoreaDaily/GallupKoreaDailyOpinion_676(20260918).pdf',pages:'1·10쪽',checkedAt:'2026-09-28',note:'N은 조사완료 사례수, 가중 N은 10쪽 해당 문항 표 기준입니다. 강원·제주는 각각 50사례 미만으로 평가 비율을 공개하지 않았습니다. 반올림으로 합계가 100%와 ±1 차이 날 수 있습니다.'},
 results:{overall:bucket(1002,1002,37,56,7),gender:rows([['남성',499,496,30,64,5],['여성',503,506,44,48,8]]),age:rows([['18~29',126,148,33,53,15],['30대',161,149,31,62,7],['40대',174,169,47,47,6],['50대',180,194,46,49,5],['60대',189,180,32,64,3],['70대 이상',172,163,33,61,6]]),region:rows([['서울',186,186,30,64,6],['인천·경기',323,326,39,53,8],['강원',32,30,null,null,null],['대전·세종·충청',107,108,35,58,7],['광주·전라',96,96,61,31,8],['대구·경북',96,96,26,69,5],['부산·울산·경남',149,148,34,61,5],['제주',13,13,null,null,null]])}
},{
 institution:'리얼미터',topic:'presidential-approval',startDate:'2026-09-07',endDate:'2026-09-11',publishedDate:'2026-09-14',sampleSize:2515,
 sourceUrl:'http://www.realmeter.net/에너지경제신문-리얼미터-9월-2주-차-주간-동향-李-대-2/',
 title:'에너지경제신문·리얼미터 2026년 9월 2주차 · 대통령 국정수행 평가',commissioner:'에너지경제신문',method:'무선 RDD · 자동응답(ARS)',responseRate:4.5,marginOfError:2,
 question:'귀하께서는 현재 이재명 대통령의 국정수행에 대하여 어떻게 평가하십니까? (보기 1~4번 순/역순 배열)',
 evidence:{url:'http://www.realmeter.net/wp-content/uploads/2026/09/보도용리얼미터주간통계표_26년9월2주차_최종_sz4.pdf',pages:'2·5·6쪽',checkedAt:'2026-09-28',note:'N은 국정수행 평가 통계표에 공표된 사례수입니다. 별도의 가중 전·후 사례수는 이 문항 표에서 구분하지 않아 임의로 복제하지 않았습니다. 긍정·부정은 원표의 합산값이며 유보는 잘 모름입니다.'},
 results:{overall:bucket(2515,null,33.8,63.3,2.9),gender:rows([['남성',1246,null,30.8,66.9,2.3],['여성',1269,null,36.8,59.6,3.6]]),age:rows([['18~29',366,null,18.6,79.5,1.9],['30대',377,null,27,69.9,3],['40대',425,null,41.2,55.4,3.4],['50대',485,null,42.6,55.3,2.1],['60대',452,null,35.4,61.2,3.4],['70대 이상',410,null,34,62.3,3.7]]),region:rows([['서울',469,null,30.5,67.6,1.8],['인천·경기',820,null,35.4,62.1,2.6],['대전·세종·충청',270,null,29.2,66.7,4.1],['강원',75,null,38.9,59.7,1.4],['부산·울산·경남',371,null,27.3,68.9,3.7],['대구·경북',239,null,22.6,72.9,4.6],['광주·전라',240,null,55.9,41.1,2.9],['제주',31,null,64,36,0]])}
},{
 institution:'NBS',topic:'presidential-approval',startDate:'2026-09-07',endDate:'2026-09-09',publishedDate:'2026-09-10',sampleSize:1002,
 sourceUrl:'http://nbsurvey.kr/archives/9303',title:'전국지표조사(NBS) 제188호 · 국정운영 평가',commissioner:'엠브레인퍼블릭·케이스탯리서치·코리아리서치·한국리서치 자체 조사',method:'휴대전화 가상번호 100% · 전화면접조사',responseRate:15.4,marginOfError:3.1,
 question:'선생님께서는 이재명 대통령이 대통령으로서 일을 잘하고 있다고 생각하십니까? 잘못하고 있다고 생각하십니까?',
 evidence:{url:'http://nbsurvey.kr/files?vid=189',pages:'첨부 ZIP의 통계표 3쪽(국정운영 평가)',checkedAt:'2026-09-28',note:'N은 조사완료 사례수, 가중 N은 가중값 적용 사례수입니다. 긍정·부정은 원표의 T2·B2 합산값을 사용합니다. 반올림으로 세부 비율 합계가 100%와 다를 수 있습니다.'},
 results:{overall:bucket(1002,1002,43,48,9),gender:rows([['남성',493,496,40,53,7],['여성',509,506,46,44,10]]),age:rows([['18~29',149,146,30,45,25],['30대',155,152,42,51,7],['40대',150,168,57,35,8],['50대',193,192,52,43,5],['60대',185,180,37,60,3],['70대 이상',170,164,37,56,7]]),region:rows([['서울',197,188,41,50,8],['인천·경기',337,325,42,50,8],['대전·세종·충청',97,108,40,51,9],['광주·전라',94,96,68,25,7],['대구·경북',90,97,37,54,9],['부산·울산·경남',144,147,35,53,13],['강원·제주',43,41,47,47,6]])}
}];

export function enrichHumanPoll(p){
 if(!p||(p.topic&&p.topic!=='presidential-approval')||!/대통령.*(?:직무|국정|일을)/.test(p.question||''))return p;
 const report=VERIFIED_HUMAN_REPORTS.find(r=>['institution','startDate','endDate','publishedDate','sampleSize'].every(k=>p[k]===r[k])&&['positive','negative','undecided'].every(k=>p.results?.overall?.[k]===r.results.overall[k]));
 if(!report)return p;
 // Preserve the stored survey ID, AI comparison approval and all AI records.
 return {...p,...structuredClone(report),provenance:{...p.provenance,questionKind:'verbatim'}};
}
export const enrichHumanRun=r=>r?.humanPolls?{...r,humanPolls:r.humanPolls.map(enrichHumanPoll)}:r;
