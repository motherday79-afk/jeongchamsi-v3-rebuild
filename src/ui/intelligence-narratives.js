const clean=value=>String(value||'').trim();

export function buildRoleNarratives(input={}){
  const signal=clean(input.signalLabel)||'정치 관심 신호';
  const issue=clean(signal.split('·')[0])||'현재 이슈';
  const audience=clean(input.audienceLabel)||'관심 구조';
  const strongest=clean(input.strongestLabel)||'핵심 지표';
  const weakest=clean(input.weakestLabel)||'보완 지표';
  const transition=clean(input.transitionLabel)||'전환력';
  const rank=Number.isFinite(Number(input.rank))?`전체 ${Number(input.rank)}위의 `:'';
  return {
    publicSignal:`${issue} 이슈를 중심으로 ${audience} 흐름이 형성된 ${signal} 국면입니다.`,
    memberDiagnosis:`현재 경쟁력의 핵심은 ${issue} 이슈를 ${audience}로 연결하는 데 있습니다. ${strongest}은 유지하되 ${weakest}을 보완해 ${transition}을 높이는 전략이 필요합니다.`,
    adminDecision:`관리 우선순위는 ${rank}${issue} 서사를 방어하면서 ${weakest} 병목을 개선하는 것입니다. ${strongest} 자산을 ${transition}으로 연결할 실행 순서를 먼저 설계해야 합니다.`,
  };
}
