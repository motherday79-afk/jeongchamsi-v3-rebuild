export const POLIMARBLE_GROUPS=Object.freeze({
 civic:{id:'civic',name:'시민사회',icon:'👥'},
 ngo:{id:'ngo',name:'NGO·공익',icon:'🌱'},
 press:{id:'press',name:'언론',icon:'📰'},
 media:{id:'media',name:'방송·미디어',icon:'📡'},
 policy:{id:'policy',name:'정책·조직',icon:'🏛️'}
});

const asset=(index,group,title,grade,price,icon)=>({index,kind:'asset',group,title,grade,price,icon,description:`${POLIMARBLE_GROUPS[group].name} 영향력 거점`});
const special=(index,kind,title,icon,description)=>({index,kind,title,icon,description,price:0});

export const POLIMARBLE_BOARD=Object.freeze([
 special(0,'start','START','🏁','정참시 폴리마블 출발지'),
 asset(1,'civic','마을시민회','C',600,'👥'),
 asset(2,'civic','청년연대','B',700,'🧑‍🤝‍🧑'),
 special(3,'public_card','민심카드','💗','민심의 흐름이 바뀌는 랜덤 이벤트'),
 asset(4,'civic','시민정책연대','A',850,'🤝'),
 special(5,'donation','민심 기부','🎁','먼저 도착한 플레이어가 기부하고 다음 다른 플레이어가 누적 민심을 획득'),
 asset(6,'civic','전국시민네트워크','S',1000,'🌐'),
 asset(7,'ngo','함께하는복지','C',750,'🫶'),
 special(8,'plaza','정참시 광장','🏛️','숨을 고르는 정참시 광장'),
 asset(9,'ngo','푸른지구네트워크','B',900,'🌍'),
 special(10,'public_card','민심카드','💗','민심의 흐름이 바뀌는 랜덤 이벤트'),
 asset(11,'ngo','사람과권리','A',1050,'⚖️'),
 asset(12,'ngo','글로벌시민연대','S',1200,'🌎'),
 special(13,'alliance','연대 강화','🤝','보유 거점 다음 강화 비용 50% 할인'),
 asset(14,'press','우리동네신문','C',900,'🗞️'),
 asset(15,'press','시민일보','B',1100,'📰'),
 special(16,'choice','운명의 선택','⚖️','안전한 선택과 승부수 중 하나를 선택'),
 special(17,'public_card','민심카드','💗','민심의 흐름이 바뀌는 랜덤 이벤트'),
 asset(18,'press','미래경제저널','A',1300,'📈'),
 asset(19,'press','코리아인사이트','S',1500,'🔎'),
 asset(20,'media','시민라디오','C',1100,'🎙️'),
 special(21,'media_focus','미디어 집중','📡','3바퀴 이후 언론·방송 거점의 민심 영향력을 강화'),
 asset(22,'media','지역공감방송','B',1350,'📻'),
 asset(23,'media','JCS 온라인TV','A',1600,'📺'),
 special(24,'tour','정참시 투어','🧭','원하는 칸을 선택해 이동'),
 special(25,'public_card','민심카드','💗','민심의 흐름이 바뀌는 랜덤 이벤트'),
 asset(26,'media','국민공감방송','S',1850,'📡'),
 asset(27,'policy','지역정책포럼','C',1300,'📋'),
 special(28,'policy_drive','정책 드라이브','🚀','보유 거점 1곳을 무료로 1단계 강화'),
 asset(29,'policy','미래정책연구소','B',1600,'🧠'),
 asset(30,'policy','국민정책네트워크','A',1900,'🕸️'),
 asset(31,'policy','JCS 전략센터','S',2300,'🏆')
]);

export const POLIMARBLE_CARDS=Object.freeze({
 SHIELD:{id:'SHIELD',name:'민심 방어권',shortLabel:'방어권',description:'다음 민심 손실 1회를 막습니다.',icon:'🛡️',rarity:'common'},
 FAVOR_PASS:{id:'FAVOR_PASS',name:'우대권',shortLabel:'우대권',description:'다음 2턴 민심 획득량에 30% 보너스.',icon:'🌟',rarity:'common'},
 DOUBLE_GAIN:{id:'DOUBLE_GAIN',name:'호응 2배권',shortLabel:'보너스 ×2',description:'다음 민심 획득 1회를 2배로 만듭니다.',icon:'⭐',rarity:'rare'},
 HALF_LOSS:{id:'HALF_LOSS',name:'위기관리권',shortLabel:'반감권',description:'다음 민심 손실 1회를 절반으로 줄입니다.',icon:'🧯',rarity:'common'},
 BONUS_MOVE:{id:'BONUS_MOVE',name:'추가 이동권',shortLabel:'+ MOVE',description:'다음 이동에 +2칸 보너스.',icon:'🎯',rarity:'rare'},
 RECORD_INSURANCE:{id:'RECORD_INSURANCE',name:'기록 보험',shortLabel:'기록 보험',description:'게임오버 시 최고 민심의 70%를 기록합니다.',icon:'📜',rarity:'epic'}
});

export const POLIMARBLE_GRADE_MULTIPLIER=Object.freeze({C:1,B:1,A:1,S:1});
export const POLIMARBLE_INFLUENCE_RATIO=Object.freeze({1:.4,2:.8,3:1.5,4:2.5});
export const POLIMARBLE_UPGRADE_RATIO=Object.freeze({2:.6,3:.9,4:1.2});
export const POLIMARBLE_START_BONUS=Object.freeze({1:1000,2:1200,3:1400,4:1500});
