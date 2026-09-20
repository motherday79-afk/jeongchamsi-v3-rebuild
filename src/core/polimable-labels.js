// JCS 0.0.31.226 · visual label/icon layer only.
// Names and icon motifs follow the approved reference image.
// NOTE: the reference image visually contained a duplicated extra bottom "민심 급등" tile.
// The approved blank board is exactly 32 cells, so the duplicate bottom copy is omitted.
// "민심 급등" remains on cell 31 exactly once.

const label=(index,name,icon,tone='navy')=>Object.freeze({index,name,icon,tone});

export const POLIMARBLE_32_TILE_LABELS=Object.freeze([
  label(0,'START','🚩','corner-start'),

  // bottom: right -> left
  label(1,'정책연구원','📚','navy'),
  label(2,'공공전략실','🏛️','navy'),
  label(3,'참여의 시간','👥','brown'),
  label(4,'정책카드','📘','green'),
  label(5,'민심 급락','📉','red'),
  label(6,'현장 취재','📷','navy'),
  label(7,'언론 토론회','🎙️','navy'),

  label(8,'정참시 광장','⛲','corner-plaza'),

  // left: bottom -> top
  label(9,'정당연구소','👥','navy'),
  label(10,'시민참여센터','🧑‍🤝‍🧑','brown'),
  label(11,'NGO연합','🌿','green'),
  label(12,'긴급이슈','⚠️','red'),
  label(13,'환경연대','🍃','green'),
  label(14,'인권네트워크','💜','navy'),
  label(15,'전략카드','🃏','purple'),

  label(16,'운명의 선택','⚖️','corner-fate'),

  // top: left -> right
  label(17,'시민포럼','👥','navy'),
  label(18,'지역연대','🤝','navy'),
  label(19,'민심 카드','❤️','green'),
  label(20,'공익네트워크','🔗','navy'),
  label(21,'긴급이슈','⚠️','red'),
  label(22,'사회혁신랩','💡','navy'),
  label(23,'현장소통','📣','brown'),

  label(24,'정참시 투어','🚌','corner-tour'),

  // right: top -> bottom
  label(25,'시민일보','📰','navy'),
  label(26,'공론신문','📰','navy'),
  label(27,'메시지 훈련','💬','red'),
  label(28,'공공방송센터','📺','navy'),
  label(29,'미디어허브','📡','navy'),
  label(30,'전략카드','🃏','purple'),
  label(31,'민심 급등','📈','green')
]);

export const POLIMARBLE_LABEL_BY_INDEX=Object.freeze(
  Object.fromEntries(POLIMARBLE_32_TILE_LABELS.map(item=>[item.index,item]))
);
