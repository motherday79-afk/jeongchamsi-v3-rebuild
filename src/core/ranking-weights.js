export const DEFAULT_RANKING_WEIGHTS=Object.freeze({news:60,search:40});
export const NEWS_WEIGHT_OPTIONS=Object.freeze(Array.from({length:11},(_,index)=>index*10));

export function validateRankingWeights(input){
  if(!input||!Number.isInteger(input.news)||!Number.isInteger(input.search)||!NEWS_WEIGHT_OPTIONS.includes(input.news)||input.search!==100-input.news)throw new Error('RANKING_WEIGHTS_INVALID');
  return {news:input.news,search:input.search};
}

export function rankingWeightLabel(weights=DEFAULT_RANKING_WEIGHTS){
  const {news,search}=validateRankingWeights(weights);
  return `뉴스 ${news}% · 검색 ${search}%`;
}

export function sameRankingWeights(left=DEFAULT_RANKING_WEIGHTS,right=DEFAULT_RANKING_WEIGHTS){
  return left.news===right.news&&left.search===right.search;
}
