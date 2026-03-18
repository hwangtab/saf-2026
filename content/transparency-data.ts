export interface ReportStat {
  value: { ko: string; en: string };
  label: { ko: string; en: string };
}

export interface Report {
  id: string;
  year: number;
  title: {
    ko: string;
    en: string;
  };
  publishedAt: {
    ko: string;
    en: string;
  };
  summary: {
    ko: string;
    en: string;
  };
  stats: ReportStat[];
  pdfFilename: string;
}

export interface YearlyGrowthRow {
  year: string;
  loans: { ko: string; en: string };
  amount: { ko: string; en: string };
  repaymentRate: { ko: string; en: string };
  subrogationRate: { ko: string; en: string };
}

export const REPORTS: Report[] = [
  {
    id: '2023',
    year: 2023,
    title: {
      ko: '2023 예술인상호부조대출 운용보고서',
      en: '2023 Artist Mutual Aid Loan Report',
    },
    publishedAt: {
      ko: '2024년 3월 12일 발행',
      en: 'Published March 12, 2024',
    },
    summary: {
      ko: '첫 해 운용 결과. 129건, 2억 9,400만 원을 지원했으며 긴급자금 수요가 전체의 56%를 차지했습니다.',
      en: 'First-year results: 129 loans totaling KRW 294 million, with emergency funds accounting for 56% of cases.',
    },
    stats: [
      { value: { ko: '129건', en: '129' }, label: { ko: '총 대출 건수', en: 'Total loans' } },
      {
        value: { ko: '2억 9,400만 원', en: 'KRW 294M' },
        label: { ko: '총 지원 금액', en: 'Amount deployed' },
      },
      {
        value: { ko: '2.64%', en: '2.64%' },
        label: { ko: '대위변제율', en: 'Subrogation rate' },
      },
    ],
    pdfFilename: '2023_예술인상호부조대출_보고서.pdf',
  },
  {
    id: '2024',
    year: 2024,
    title: {
      ko: '2024 예술인상호부조대출 운용보고서',
      en: '2024 Artist Mutual Aid Loan Report',
    },
    publishedAt: {
      ko: '2025년 4월 17일 발행',
      en: 'Published April 17, 2025',
    },
    summary: {
      ko: '305건, 6억 900만 원을 지원. 완납률 50.5%를 달성하며 기금 순환 구조가 안정 궤도에 진입했습니다.',
      en: '305 loans, KRW 609 million deployed. A 50.5% full repayment rate confirms the fund cycle is maturing.',
    },
    stats: [
      { value: { ko: '305건', en: '305' }, label: { ko: '총 대출 건수', en: 'Total loans' } },
      {
        value: { ko: '6억 900만 원', en: 'KRW 609M' },
        label: { ko: '총 지원 금액', en: 'Amount deployed' },
      },
      {
        value: { ko: '50.5%', en: '50.5%' },
        label: { ko: '완납률', en: 'Full repayment rate' },
      },
    ],
    pdfFilename: '2024_예술인상호부조대출_보고서.pdf',
  },
  {
    id: '2025',
    year: 2025,
    title: {
      ko: '2025 예술인금융재난 보고서',
      en: '2025 Artist Financial Crisis Report',
    },
    publishedAt: {
      ko: '2025년 10월 18일 발행',
      en: 'Published October 18, 2025',
    },
    summary: {
      ko: '354건, 약 7억 원 누적 지원. 상환율 95%, 1금융권 배제율 84.9%의 구조적 데이터를 종합 분석했습니다.',
      en: '354 loans, ~KRW 700M cumulative. 95% repayment rate. Structural data reveals 84.9% primary bank exclusion.',
    },
    stats: [
      {
        value: { ko: '354건', en: '354' },
        label: { ko: '누적 대출 건수', en: 'Cumulative loans' },
      },
      {
        value: { ko: '약 7억 원', en: '~KRW 700M' },
        label: { ko: '누적 지원 금액', en: 'Total deployed' },
      },
      { value: { ko: '95%', en: '95%' }, label: { ko: '상환율', en: 'Repayment rate' } },
    ],
    pdfFilename: '2025_예술인금융재난보고서.pdf',
  },
];

// 대출 조건
export const LOAN_TERMS = {
  rateRange: { ko: '연 3.0 ~ 5.5%', en: '3.0–5.5% p.a.' },
  source: { ko: '2024 운용보고서 기준', en: 'Source: 2024 Operation Report' },
};

// 이자 절감 효과
export const INTEREST_SAVING = {
  value: { ko: '약 1억 4천만 원', en: '~KRW 140M' },
  label: { ko: '이자 절감 효과', en: 'Interest saved vs. market rate' },
  note: {
    ko: '카드론(15%) 또는 대부업(20%) 이용 시와 비교한 추산값입니다.',
    en: 'Estimated savings vs. card loan (15%) or lending (20%) rates.',
  },
};

// 분야별 수혜자 분포 (2024 운용보고서 기준)
export interface BorrowerField {
  field: { ko: string; en: string };
  rate: string;
}

export const BORROWER_FIELDS: BorrowerField[] = [
  { field: { ko: '연극·영화', en: 'Theater / Film' }, rate: '35.4%' },
  { field: { ko: '음악', en: 'Music' }, rate: '30.2%' },
  { field: { ko: '미술·사진', en: 'Visual Arts' }, rate: '23.6%' },
  { field: { ko: '문학', en: 'Literature' }, rate: '7.2%' },
];

export const YEARLY_GROWTH: YearlyGrowthRow[] = [
  {
    year: '2023',
    loans: { ko: '129건', en: '129 loans' },
    amount: { ko: '2억 9,400만 원', en: 'KRW 294M' },
    repaymentRate: { ko: '약 97%', en: '~97%' },
    subrogationRate: { ko: '2.64% (5건)', en: '2.64% (5 cases)' },
  },
  {
    year: '2024',
    loans: { ko: '305건', en: '305 loans' },
    amount: { ko: '6억 900만 원', en: 'KRW 609M' },
    repaymentRate: { ko: '완납률 50.5%', en: '50.5% full repayment' },
    subrogationRate: { ko: '5.1% (20건)', en: '5.1% (20 cases)' },
  },
  {
    year: '2025',
    loans: { ko: '354건 (누적)', en: '354 (cumulative)' },
    amount: { ko: '약 7억 원 (누적)', en: '~KRW 700M (cumulative)' },
    repaymentRate: { ko: '95%', en: '95%' },
    subrogationRate: { ko: '5.10%', en: '5.10%' },
  },
];
