// Person IDs are permanent identities, never ministry seat numbers. Reuse existing MPs.
export const GOVERNMENT_VERIFIED_AT='2026-10-09';
const presidency='https://www.president.go.kr/information-disclosure/proactive';
const rows=[
 ['government-001','이재명','대한민국 제21대 대통령','대통령','국정 총괄','https://www.president.go.kr/'],
 ['government-002','한성숙','국무총리','리더십','국정 총괄·부처 조정','https://www.opm.go.kr/opm/news/press-release.do?articleNo=163616&mode=view'],
 ['government-003','강훈식','대통령비서실장','리더십','대통령비서실 총괄',presidency],
 ['government-004','하준경','정책실장','리더십','경제·사회 정책 조정',presidency],
 ['government-005','위성락','국가안보실장','리더십','외교·안보 정책 조정','https://www.president.go.kr/briefings/F5SIMqwS'],
 ['government-006','임기근','국무조정실장','리더십','부처 간 정책 조정·국정현안 관리','https://www.opm.go.kr/opm/office/profile01.do'],
 ['government-007','채이배','국무총리비서실장','리더십','국무총리 보좌·비서실 총괄','https://www.opm.go.kr/opm/office/profile02.do'],
 ['government-008','이형일','재정경제부','부총리 겸 장관','경제정책·세제·재정','https://www.korea.kr/briefing/pressReleaseList.do?pWiseMinistry=ministryNews&repCode=A00041&repCodeType=정부부처'],
 ['government-009','배경훈','과학기술정보통신부','부총리 겸 장관','과학기술·AI·정보통신','https://www.msit.go.kr/user/mnstrSchdl/mnstr.do?mId=313&mPid=312&sCode=user'],
 ['government-010','최교진','교육부','장관','교육정책','https://www.moe.go.kr/boardCnts/listRenew.do?boardID=72729&m=010203&page=1&prntBoardID=0&prntBoardSeq=0&prntLev=0&renew=D&s=moe&searchType=S'],
 ['government-011','조현','외교부','장관','외교·국제협력','https://www.mofa.go.kr/minister/wpge/m_20035/contents.do'],
 ['assembly-042','정동영','통일부','장관','남북관계·통일정책','https://www.unikorea.go.kr/web/unikorea/main'],
 ['government-012','이진수','법무부','장관 직무대행 · 차관','법무·인권·출입국','https://www.immigration.go.kr/bbs/moj/182/609747/artclView.do'],
 ['government-013','강신철','국방부','장관','국방·군사정책','https://kookbang.dema.mil.kr/newsWeb/allToday.do'],
 ['assembly-030','윤호중','행정안전부','장관','정부혁신·지방행정·재난안전','https://mois.go.kr/frt/bbs/type010/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000008&nttId=129173'],
 ['government-014','권오을','국가보훈부','장관','보훈정책','https://mpva.go.kr/'],
 ['government-015','최휘영','문화체육관광부','장관','문화·관광·체육·콘텐츠','https://www.korea.kr/news/policyNewsView.do?newsId=148972198'],
 ['government-016','송미령','농림축산식품부','장관','농업·농촌·식품','https://www.korea.kr/briefing/policyBriefingList.do'],
 ['government-017','김정관','산업통상부','장관','산업·통상','https://admin.korea.kr/briefing/pressReleaseView.do?newsId=156784304'],
 ['government-018','정은경','보건복지부','장관','보건의료·복지','https://admin.korea.kr/briefing/pressReleaseView.do?newsId=156783092'],
 ['assembly-043','김성환','기후에너지환경부','장관','기후·환경·에너지전환','https://www.mcee.go.kr/home/web/staff/list.do?condition.upperDeptCd=1482001&menuId=10433'],
 ['government-019','김영훈','고용노동부','장관','고용·노동정책','https://www.korea.kr/briefing/pressReleaseList.do?endDate=&pageIndex=11&repCode=&repCodeType=&srchWord=&startDate='],
 ['government-020','원민경','성평등가족부','장관','성평등·가족·청소년','https://m.korea.kr/briefing/pressReleaseView.do?newsId=156784645'],
 ['government-021','홍지선','국토교통부','장관','국토·주택·교통','https://m.korea.kr/briefing/pressReleaseView.do?newsId=156784648'],
 ['assembly-035','박홍근','기획예산처','장관','국가전략·예산·재정운용','https://www.mpb.go.kr/web/main/main'],
 ['government-022','황종우','해양수산부','장관','해양·수산·항만·해운','https://coast.mof.go.kr/coastNews/board/newsBoardView.do?dt2=620&page=1&searchCondition=&searchKeyword=&seq=12398'],
 ['assembly-165','이소영','중소벤처기업부','장관','중소기업·벤처·소상공인','https://mss.go.kr/site/smba/submain/submain07.do']
];
export const GOVERNMENT_PEOPLE=Object.freeze(rows.map(([id,name,office,title,area,sourceUrl])=>Object.freeze({id,name,office,title,area,sourceUrl,verifiedAt:GOVERNMENT_VERIFIED_AT,role:title==='대통령'||title==='리더십'?office:`${office} ${title}`,section:title==='대통령'?'president':title==='리더십'?'leadership':'cabinet'})));
export const GOVERNMENT_PERSON_IDS=Object.freeze(Object.fromEntries(GOVERNMENT_PEOPLE.map(person=>[person.name,person.id])));
const byId=new Map(GOVERNMENT_PEOPLE.map(person=>[person.id,person]));
export function applyGovernmentRole(person){
 const member=byId.get(person?.id);if(!member||member.name!==person.name)return person;
 const primaryRole={title:member.role,roleStatus:member.title.includes('직무대행')?'acting':'appointed',sourceLabel:'정부·부처 공식 공개자료',sourceUrl:member.sourceUrl,verifiedAt:member.verifiedAt,effectiveFrom:person.id==='government-001'?'2025-06-04':'',effectiveTo:''};
 const others=(person.currentRoles||[]).filter(role=>role.title!==member.role&&!role.title?.includes('후보자'));
 const history=[...(person.roleHistory||[]),...(person.currentRoles||[]).filter(role=>role.title?.includes('후보자')).map(role=>({...role,roleStatus:'ended'}))];
 return {...person,governmentMember:true,governmentSection:member.section,office:member.role,primaryRole,currentRoles:[primaryRole,...others],roleHistory:history,secondaryRole:person.type==='assembly'?['제22대 국회의원',person.jurisdiction].filter(Boolean).join(' · '):'',sourceUrl:member.sourceUrl,verifiedAt:member.verifiedAt,roleStatus:primaryRole.roleStatus};
}
export const GOVERNMENT_POLITICIANS=Object.freeze(GOVERNMENT_PEOPLE.filter(person=>person.id.startsWith('government-')).map(person=>applyGovernmentRole({id:person.id,name:person.name,type:'government',slot:Number(person.id.split('-')[1]),party:'',roleLabel:person.role,groupLabel:'대통령·정부',connected:true,isVacant:false,region:'전국',jurisdiction:person.area,jurisdictionLabel:'담당 업무',office:person.role,terms:'',committee:'',termStart:person.id==='government-001'?'2025-06-04':'',termEnd:'',electionLabel:'',source:'정부·부처 공식 공개자료',currentRoles:[],roleHistory:person.id==='government-001'?['성남시장','경기도지사','제21·22대 국회의원','더불어민주당 대표'].map(title=>({title,roleStatus:'ended'})):[]})));
