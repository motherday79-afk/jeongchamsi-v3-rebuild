import { TEN_GOD_LABELS } from './constants.js';
import { pickStable } from './utils.js';
function bandOf(score) {
    if (score >= 85)
        return 'excellent';
    if (score >= 75)
        return 'good';
    if (score >= 65)
        return 'steady';
    if (score >= 55)
        return 'caution';
    return 'slow';
}
const TITLES = {
    overall: {
        excellent: '흐름이 선명한 날',
        good: '기세를 살리기 좋은 날',
        steady: '차분하게 쌓아가는 날',
        caution: '속도를 조절할 날',
        slow: '정리와 점검에 무게를 둘 날'
    },
    money: {
        excellent: '금전 흐름이 가벼운 편',
        good: '관리와 선택이 잘 맞는 편',
        steady: '평소의 기준을 지키기 좋은 편',
        caution: '지출 판단을 한 번 더 볼 때',
        slow: '보수적으로 관리할 때'
    },
    business: {
        excellent: '실행력이 살아나는 흐름',
        good: '일을 앞으로 밀기 좋은 흐름',
        steady: '진행 중인 일을 다듬기 좋은 흐름',
        caution: '확인과 조율이 필요한 흐름',
        slow: '무리한 확장보다 정리가 먼저인 흐름'
    },
    relationship: {
        excellent: '사람과의 호흡이 잘 맞는 흐름',
        good: '대화가 부드럽게 이어지는 흐름',
        steady: '관계를 안정적으로 유지하는 흐름',
        caution: '말의 속도를 조금 낮출 때',
        slow: '거리와 표현을 조절할 때'
    }
};
const SUMMARY_POOLS = {
    overall: {
        excellent: ['미뤄둔 일을 움직이거나 새로운 제안을 검토하기 좋은 흐름입니다.', '오늘은 생각을 행동으로 옮길 때 힘이 붙는 편입니다.', '주요 일정에 집중하면 성과감을 느끼기 좋은 날입니다.'],
        good: ['큰 무리 없이 계획을 전진시키기 좋은 날입니다.', '해야 할 일의 우선순위를 잡으면 흐름을 살리기 좋습니다.', '평소보다 한 발 빠르게 움직여도 부담이 적은 편입니다.'],
        steady: ['새로운 것보다 진행 중인 일을 차근차근 완성해보세요.', '기본 리듬을 지키는 것이 가장 편안한 흐름입니다.', '서두르기보다 순서를 지키면 안정감이 살아납니다.'],
        caution: ['결정을 서두르기보다 한 번 더 확인하는 편이 좋습니다.', '오늘은 속도보다 정확도에 무게를 두는 편이 편합니다.', '해야 할 일을 줄이고 중요한 것부터 정리해보세요.'],
        slow: ['큰 결정보다는 정리와 점검에 힘을 쓰는 편이 좋습니다.', '무리하게 흐름을 바꾸기보다 현재 상태를 다듬어보세요.', '잠깐 멈춰 기준을 다시 세우는 것이 도움이 되는 날입니다.']
    },
    money: {
        excellent: ['돈의 흐름을 정리하거나 필요한 선택을 하기 좋은 편입니다.', '수입과 지출의 우선순위가 비교적 또렷하게 보이는 날입니다.', '금전 관련 계획을 점검하면 판단이 깔끔해지는 흐름입니다.'],
        good: ['계획한 범위 안에서 움직이면 안정적인 흐름입니다.', '지출과 저축의 균형을 다시 보기 좋은 날입니다.', '필요한 것과 미룰 것을 구분하기 좋은 편입니다.'],
        steady: ['평소의 소비 기준을 유지하는 것이 가장 무난합니다.', '새로운 결정보다 기존 계획을 지키는 편이 편합니다.', '작은 지출을 정리하면 전체 흐름이 안정됩니다.'],
        caution: ['충동적인 지출은 한 번 더 생각해보는 편이 좋습니다.', '오늘은 큰 금액보다 작은 새는 지출을 확인해보세요.', '돈과 관련한 결정은 비교한 뒤 움직이는 편이 좋습니다.'],
        slow: ['큰 금전 결정은 서두르지 않는 편이 좋습니다.', '오늘은 벌리기보다 지키는 쪽에 무게를 두어보세요.', '지출 계획을 보수적으로 잡으면 마음이 편해집니다.']
    },
    business: {
        excellent: ['새로운 제안이나 실행에 힘이 붙는 편입니다.', '일의 방향을 잡고 바로 움직이기 좋은 흐름입니다.', '협업이나 추진이 필요한 일을 앞에 두기 좋습니다.'],
        good: ['계획을 구체화하고 다음 단계로 넘기기 좋은 편입니다.', '업무 우선순위를 정하면 속도가 붙을 수 있습니다.', '논의 중인 일을 실행안으로 바꾸기 좋은 흐름입니다.'],
        steady: ['새 일보다 진행 중인 업무의 완성도를 높여보세요.', '정리와 후속 조치에 힘을 쓰면 안정적인 흐름입니다.', '기존 계획을 다듬는 쪽에서 성과를 내기 좋습니다.'],
        caution: ['중요한 업무는 확인 절차를 하나 더 두는 편이 좋습니다.', '속도보다 역할과 조건을 명확히 하는 것이 우선입니다.', '새로운 약속은 범위를 분명히 한 뒤 잡아보세요.'],
        slow: ['확장보다 정리와 재검토가 더 잘 맞는 날입니다.', '무리하게 일을 늘리기보다 우선순위를 줄여보세요.', '큰 실행은 준비 상태를 다시 확인한 뒤 잡는 편이 좋습니다.']
    },
    relationship: {
        excellent: ['사람을 통해 좋은 정보나 기분 좋은 흐름을 얻기 쉽습니다.', '먼저 말을 건네거나 관계를 풀어가기 좋은 날입니다.', '협의와 대화에서 서로의 의도가 잘 맞는 편입니다.'],
        good: ['대화를 조금 더 열어두면 관계가 편해질 수 있습니다.', '혼자 결정하기보다 의견을 나누는 편이 좋은 흐름입니다.', '부드러운 표현이 관계를 한층 편하게 만듭니다.'],
        steady: ['평소처럼 편안한 거리감을 유지하면 충분합니다.', '크게 움직이기보다 익숙한 관계를 잘 챙겨보세요.', '상대의 말을 끝까지 듣는 것만으로도 흐름이 안정됩니다.'],
        caution: ['말을 빠르게 결론내리기보다 한 번 더 듣는 편이 좋습니다.', '작은 오해가 생기지 않도록 표현을 분명히 해보세요.', '의견 차이가 있다면 결론보다 과정에 집중해보세요.'],
        slow: ['예민한 이야기는 조금 늦춰도 괜찮습니다.', '오늘은 설득보다 거리 조절이 더 편한 흐름입니다.', '감정적인 표현보다 필요한 말만 또렷하게 전해보세요.']
    }
};
function signalDetail(category, signals) {
    const ten = TEN_GOD_LABELS[signals.tenGod];
    const rel = signals.branchRelations;
    const relationText = rel.clash > 0 || rel.harm > 0
        ? '합보다 충·해 신호가 함께 있어 조율이 중요합니다.'
        : rel.combine > 0 || rel.threeHarmony > 0
            ? '합의 흐름이 있어 연결과 협업 쪽에 힘이 실립니다.'
            : '지지 관계는 비교적 중립적인 편입니다.';
    const balanceText = signals.elementBalanceDelta > 2
        ? '오행 균형은 오늘의 기운이 부족한 부분을 일부 보완하는 쪽입니다.'
        : signals.elementBalanceDelta < -2
            ? '오행 균형은 한쪽으로 쏠리지 않도록 속도 조절이 필요한 편입니다.'
            : '오행 균형은 큰 흔들림 없이 무난한 편입니다.';
    if (category === 'overall')
        return `오늘의 일간 십성은 ${ten} 흐름입니다. ${balanceText} ${relationText}`;
    if (category === 'money')
        return `금전 해석은 오늘의 ${ten} 흐름과 오행 균형을 함께 반영했습니다. ${balanceText}`;
    if (category === 'business')
        return `일·사업 해석은 오늘의 ${ten} 흐름, 오행 균형, 합충 신호를 함께 반영했습니다. ${relationText}`;
    return `인간관계 해석은 오늘의 ${ten} 흐름과 지지의 합충 관계를 중심으로 반영했습니다. ${relationText}`;
}
export function interpretCategory(args) {
    const band = bandOf(args.score);
    return {
        score: args.score,
        band,
        title: TITLES[args.category][band],
        summary: pickStable(SUMMARY_POOLS[args.category][band], `${args.seed}:summary`),
        detail: signalDetail(args.category, args.signals)
    };
}
export function interpretAll(raw, seedBase) {
    return {
        overall: interpretCategory({ category: 'overall', score: raw.overall, signals: raw.signals, seed: `${seedBase}:overall` }),
        money: interpretCategory({ category: 'money', score: raw.money, signals: raw.signals, seed: `${seedBase}:money` }),
        business: interpretCategory({ category: 'business', score: raw.business, signals: raw.signals, seed: `${seedBase}:business` }),
        relationship: interpretCategory({ category: 'relationship', score: raw.relationship, signals: raw.signals, seed: `${seedBase}:relationship` })
    };
}
