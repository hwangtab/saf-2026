/**
 * 차트 데이터 - 예술인 금융 실태조사 결과
 * 출처: 한국스마트협동조합 2024년 예술인 금융 실태조사
 */

// 제1금융권 접근 현황
export const firstBankAccessData = [
  { name: '제1금융권 배제', value: 84.9 },
  { name: '접근 가능', value: 15.1 },
];

// 대출 거절/포기 주요 사유
export const rejectionReasonsData = [
  { reason: '정기 소득 없음', count: 65 },
  { reason: '신용등급 부족', count: 58 },
  { reason: '담보 부족', count: 52 },
  { reason: '고용 불안정', count: 48 },
  { reason: '기타', count: 35 },
];

// 고리대금 상품 이용 현황
export const highInterestProductData = [
  { product: '카드론', percentage: 42 },
  { product: '현금서비스', percentage: 38 },
  { product: '소액대출', percentage: 22 },
  { product: '사채', percentage: 15 },
];

// 대출 이자율 분포
export const interestRateDistributionData = [
  { range: '~ 10%', count: 8 },
  { range: '10 ~ 15%', count: 12 },
  { range: '15 ~ 20%', count: 35 },
  { range: '20 ~ 30%', count: 32 },
  { range: '30% ~', count: 13 },
];

// 채권추심 경험 여부
export const debtCollectionData = [
  { name: '경험함', value: 38 },
  { name: '경험 없음', value: 62 },
];

// 금융 어려움으로 인한 창작활동 영향
export const creativeImpactData = [
  { impact: '창작 중단', percentage: 45 },
  { impact: '창작량 감소', percentage: 68 },
  { impact: '품질 저하', percentage: 52 },
  { impact: '활동 제한', percentage: 58 },
];
