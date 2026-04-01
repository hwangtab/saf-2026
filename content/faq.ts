import { STATISTICS_DATA } from '@/lib/constants';

export interface FAQItem {
  question: string;
  answer: string;
}

const loanGoalStat = STATISTICS_DATA.find((stat) => stat.label === '대출 가능 금액');
const loanGoal = loanGoalStat ? `${loanGoalStat.value / 100000000}억` : '10억';

const repaymentRateStat = STATISTICS_DATA.find((stat) => stat.label === '상호부조 대출 상환율');
const repaymentRate = repaymentRateStat ? `${repaymentRateStat.value}%` : '95%';

export const faqs: FAQItem[] = [
  {
    question: '씨앗페 온라인이란 무엇인가요?',
    answer:
      '씨앗페 온라인은 한국 예술인들의 상호부조 대출 기금 마련을 위한 특별전입니다. 조합원 가입과 작품 구매를 통해 예술인들에게 안정적인 창작 환경을 제공합니다.',
  },
  {
    question: '조합원 가입은 어떻게 하나요?',
    answer:
      '홈페이지의 "조합원 가입" 버튼을 눌러 한국스마트협동조합의 일원이 되실 수 있습니다. 조합원 가입을 통해 예술인 상호부조 기금 조성과 운영에 지속적인 힘을 보태주세요.',
  },
  {
    question: '전시는 언제 어디서 열리나요?',
    answer:
      '오프라인 전시는 2026년 1월 26일 성황리에 종료되었습니다. 이 사이트를 통해 온라인 전시는 상설로 계속 진행되므로, 언제든 작품을 감상하고 구매하실 수 있습니다.',
  },
  {
    question: '상호부조 대출이란 무엇인가요?',
    answer: `제1금융권에서 소외된 예술인들을 위해, 조성된 기금을 바탕으로 연 5%의 고정금리로 대출해주는 시스템입니다. 현재 ${repaymentRate}의 높은 상환율을 유지하고 있습니다.`,
  },
  {
    question: '씨앗페 온라인의 목표 금액은 얼마인가요?',
    answer: `이번 캠페인을 통해 총 ${loanGoal} 원의 상호부조 대출 가능 기금 확보를 목표로 하고 있습니다. 여러분의 조합원 가입과 작품 구매가 이 목표를 가능하게 합니다.`,
  },
  {
    question: '구매한 작품의 배송은 어떻게 이루어지나요?',
    answer:
      '기본적으로 주문 금액 20만원 이상은 무료 배송(미만 시 4,000원)입니다. 단, 대형 작품(세 변의 합 180cm 이상)이나 파손 위험이 있는 작품(유리, 도자 등)은 미술품 전문 운송 차량으로 배송되며, 지역에 따라 별도 비용(3.5만원~30만원)이 발생할 수 있습니다. 평균 배송일은 결제 확인 후 영업일 기준 3~4일입니다.',
  },
];

export const faqsEn: FAQItem[] = [
  {
    question: 'What is SAF Online?',
    answer:
      'SAF Online is a special exhibition that raises a mutual-aid loan fund for Korean artists. Through co-op membership and artwork purchases, it helps create a stable environment for creative work.',
  },
  {
    question: 'How can I join the cooperative?',
    answer:
      'Click the "Join Co-op" button on the website to become a member of Korea Smart Cooperative. Your membership supports the creation and operation of the artist mutual-aid fund.',
  },
  {
    question: 'When and where is the exhibition held?',
    answer:
      'The offline exhibition concluded on January 26, 2026. The online exhibition remains open on this site, so you can continue to view and purchase artworks anytime.',
  },
  {
    question: 'What is a mutual-aid loan?',
    answer:
      'It is a financing program for artists excluded from primary banking, offering fixed-rate loans at around 5% APR based on a jointly built fund. The program currently maintains a high repayment rate of over 95%.',
  },
  {
    question: 'What is the funding goal of SAF Online?',
    answer:
      'This campaign aims to secure a mutual-aid loan fund capacity of about KRW 1 billion. Co-op membership and artwork purchases make this goal possible.',
  },
  {
    question: 'How are purchased artworks delivered?',
    answer:
      'Orders over KRW 200,000 are generally shipped free (KRW 4,000 below that threshold). Large or fragile works may require specialized art transport with additional regional fees. Typical delivery is 3-4 business days after payment confirmation.',
  },
];

export function getFaqsByLocale(locale: 'ko' | 'en'): FAQItem[] {
  return locale === 'en' ? faqsEn : faqs;
}
