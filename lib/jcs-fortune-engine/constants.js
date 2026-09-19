export const STEM_META = {
    甲: { element: 'wood', yinYang: 'yang' },
    乙: { element: 'wood', yinYang: 'yin' },
    丙: { element: 'fire', yinYang: 'yang' },
    丁: { element: 'fire', yinYang: 'yin' },
    戊: { element: 'earth', yinYang: 'yang' },
    己: { element: 'earth', yinYang: 'yin' },
    庚: { element: 'metal', yinYang: 'yang' },
    辛: { element: 'metal', yinYang: 'yin' },
    壬: { element: 'water', yinYang: 'yang' },
    癸: { element: 'water', yinYang: 'yin' }
};
/** Hidden stems ordered main/middle/residual. */
export const BRANCH_HIDDEN_STEMS = {
    子: ['癸'],
    丑: ['己', '癸', '辛'],
    寅: ['甲', '丙', '戊'],
    卯: ['乙'],
    辰: ['戊', '乙', '癸'],
    巳: ['丙', '戊', '庚'],
    午: ['丁', '己'],
    未: ['己', '丁', '乙'],
    申: ['庚', '壬', '戊'],
    酉: ['辛'],
    戌: ['戊', '辛', '丁'],
    亥: ['壬', '甲']
};
export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
export const GENERATES = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood'
};
export const CONTROLS = {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood'
};
export const SIX_COMBINES = new Set(['子丑', '丑子', '寅亥', '亥寅', '卯戌', '戌卯', '辰酉', '酉辰', '巳申', '申巳', '午未', '未午']);
export const SIX_CLASHES = new Set(['子午', '午子', '丑未', '未丑', '寅申', '申寅', '卯酉', '酉卯', '辰戌', '戌辰', '巳亥', '亥巳']);
export const SIX_HARMS = new Set(['子未', '未子', '丑午', '午丑', '寅巳', '巳寅', '卯辰', '辰卯', '申亥', '亥申', '酉戌', '戌酉']);
export const THREE_HARMONY_GROUPS = [
    new Set(['申', '子', '辰']),
    new Set(['亥', '卯', '未']),
    new Set(['寅', '午', '戌']),
    new Set(['巳', '酉', '丑'])
];
export const STEM_COMBINES = new Set(['甲己', '己甲', '乙庚', '庚乙', '丙辛', '辛丙', '丁壬', '壬丁', '戊癸', '癸戊']);
export const TEN_GOD_LABELS = {
    比肩: '비견',
    劫財: '겁재',
    食神: '식신',
    傷官: '상관',
    偏財: '편재',
    正財: '정재',
    七殺: '편관',
    正官: '정관',
    偏印: '편인',
    正印: '정인'
};
