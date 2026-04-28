import { LOAN_COUNT } from '@/lib/site-stats';
import { FAQItem, generateFAQSchema } from './content';

const OUR_PROOF_FAQ_ITEMS: Record<'ko' | 'en', FAQItem[]> = {
  en: [
    {
      question: 'What are the results of the SAF mutual-aid loan program?',
      answer: `${LOAN_COUNT} mutual-aid loans have been issued since December 2022, totaling nearly KRW 700 million. The repayment rate stands at 95%, demonstrating that artists are reliable borrowers when given fair financial terms.`,
    },
    {
      question: 'What is the default rate for SAF mutual-aid loans?',
      answer:
        'The subrogation (default) rate for SAF mutual-aid loans is approximately 5.10% — lower than the typical default rate for low-credit bank loans. This is achieved through community accountability and solidarity-based screening.',
    },
    {
      question: 'How does the SAF mutual-aid loan program work?',
      answer:
        'The Korea Smart Cooperative builds a shared fund through artwork sales and member contributions. Partner financial institutions then lend up to 7x that amount to artists at a fixed 5% annual rate. Artists receive loans without credit screening, based on cooperative membership and community accountability.',
    },
  ],
  ko: [
    {
      question: '씨앗페 상호부조 대출의 실제 성과는 어떻게 되나요?',
      answer: `2022년 12월부터 ${LOAN_COUNT}건의 상호부조 대출이 실행되어 약 7억 원이 지원되었습니다. 상환율은 95%로, 공정한 금융 조건이 주어지면 예술인도 신뢰할 수 있는 대출자임을 증명합니다.`,
    },
    {
      question: '씨앗페 상호부조 대출의 연체율은 얼마인가요?',
      answer:
        '씨앗페 상호부조 대출의 대위변제율은 약 5.10%로, 일반 금융기관 저신용 대출 연체율보다 낮은 수준입니다. 이는 조합원 간의 연대와 상호 책임 구조를 통해 달성됩니다.',
    },
    {
      question: '씨앗페 상호부조 대출은 어떻게 작동하나요?',
      answer:
        '한국스마트협동조합이 작품 판매 수익과 조합원 출자금으로 기금을 조성하고, 협약 금융기관이 기금의 약 7배에 달하는 금액을 연 5% 고정금리로 예술인에게 대출합니다. 신용등급 심사 없이 조합원 자격과 상호 책임 구조를 기반으로 대출이 실행됩니다.',
    },
  ],
};

export const getOurProofFaqItems = (locale: 'ko' | 'en'): FAQItem[] => {
  return OUR_PROOF_FAQ_ITEMS[locale].map((item) => ({ ...item }));
};

export const getOurProofFaqSchema = (locale: 'ko' | 'en') => {
  const items = getOurProofFaqItems(locale);
  return {
    items,
    schema: generateFAQSchema(items, locale),
  };
};
