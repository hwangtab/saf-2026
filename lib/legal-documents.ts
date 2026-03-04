import { CONTACT } from '@/lib/constants';

export type LegalDocumentSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  version?: string;
  sections: LegalDocumentSection[];
};

export const ARTIST_APPLICATION_TERMS_DOCUMENT: LegalDocument = {
  title: '아티스트 이용약관',
  effectiveDate: '2026년 2월 26일',
  version: '2026-02-26',
  sections: [
    {
      title: '1. 적용 대상',
      paragraphs: [
        '본 약관은 씨앗페 2026에 아티스트로 가입 신청하거나 작품 정보를 제출하는 이용자에게 적용됩니다.',
      ],
    },
    {
      title: '2. 제출 정보의 진실성',
      paragraphs: [
        '신청자는 작가명, 연락처, 소개 및 작품 관련 정보를 사실에 근거해 제출해야 하며, 허위 또는 타인 권리를 침해하는 정보 제출 시 승인 보류 또는 제한이 발생할 수 있습니다.',
      ],
    },
    {
      title: '3. 심사 및 승인',
      paragraphs: [
        '제출된 정보는 운영 정책에 따라 심사되며, 승인 여부와 시점은 내부 운영 상황에 따라 달라질 수 있습니다. 심사 과정에서 보완 요청이 있을 수 있습니다.',
      ],
    },
    {
      title: '4. 저작권 및 책임',
      paragraphs: [
        '작품 이미지와 설명에 대한 권리는 원저작자에게 있으며, 신청자는 제출한 콘텐츠에 대한 필요한 권리를 보유하고 있음을 보장합니다. 제3자 분쟁 발생 시 관련 법령과 내부 절차에 따라 처리됩니다.',
      ],
    },
    {
      title: '5. 문의처',
      paragraphs: [`이메일: ${CONTACT.EMAIL}`, `연락처: ${CONTACT.PHONE}`],
    },
  ],
};

export const EXHIBITOR_APPLICATION_TERMS_DOCUMENT: LegalDocument = {
  title: '출품자 이용약관',
  effectiveDate: '2026년 2월 26일',
  version: '2026-02-26',
  sections: [
    {
      title: '1. 적용 대상',
      paragraphs: [
        '본 약관은 씨앗페 2026에 출품자(갤러리, 기획자, 단체 등)로 가입 신청하고 관련 정보를 운영하는 이용자에게 적용됩니다.',
      ],
    },
    {
      title: '2. 운영 정보 제출 및 관리',
      paragraphs: [
        '출품자는 대표명, 연락처, 소개 등 신청 정보를 정확하게 제공해야 하며, 승인 이후에도 최신 정보가 유지되도록 관리해야 합니다.',
      ],
    },
    {
      title: '3. 전시/출품 운영 책임',
      paragraphs: [
        '출품자가 등록, 관리하는 작가 및 작품 정보, 전시 운영 관련 내용은 관련 법령과 내부 운영 정책을 준수해야 하며, 권리 침해나 허위 정보 발생 시 시정 또는 이용 제한이 적용될 수 있습니다.',
      ],
    },
    {
      title: '4. 승인 및 제한',
      paragraphs: [
        '신청 정보는 내부 심사를 거쳐 승인 여부가 결정됩니다. 정책 위반, 반복적인 운영 문제, 허위 정보가 확인되는 경우 승인 보류 또는 계정 운영 제한이 이루어질 수 있습니다.',
      ],
    },
    {
      title: '5. 문의처',
      paragraphs: [`이메일: ${CONTACT.EMAIL}`, `연락처: ${CONTACT.PHONE}`],
    },
  ],
};

export const PRIVACY_POLICY_DOCUMENT: LegalDocument = {
  title: '개인정보처리방침',
  effectiveDate: '2026년 2월 26일',
  sections: [
    {
      title: '1. 수집하는 개인정보 항목',
      paragraphs: [
        '씨앗페 2026은 서비스 운영에 필요한 최소한의 정보를 수집합니다. 문의, 조합원 가입 안내, 작품 구매 및 주문 확인 과정에서 이름, 연락처, 이메일, 배송 정보, 결제 관련 정보가 처리될 수 있습니다.',
      ],
    },
    {
      title: '2. 개인정보의 이용 목적',
      bullets: [
        '작품 주문, 결제 확인, 배송 및 CS 응대',
        '조합원 가입 및 캠페인 참여 안내',
        '문의 응답, 공지 전달, 서비스 운영 안정화',
        '관련 법령 준수를 위한 기록 보관',
      ],
    },
    {
      title: '3. 개인정보 보유 및 이용 기간',
      paragraphs: [
        '개인정보는 수집 및 이용 목적이 달성되면 지체 없이 파기합니다. 다만 전자상거래, 소비자보호, 세무 관련 법령 등에서 일정 기간 보관을 요구하는 경우 해당 기간 동안 안전하게 보관한 뒤 파기합니다.',
      ],
    },
    {
      title: '4. 제3자 제공 및 처리위탁',
      paragraphs: [
        '주문 처리 및 결제, 배송, 고객 응대를 위해 필요한 범위 내에서 결제, 쇼핑몰, 물류 서비스에 개인정보 처리가 위탁될 수 있습니다. 이 경우 관계 법령에 따라 수탁사를 관리하고 보호조치를 적용합니다.',
      ],
    },
    {
      title: '5. 이용자의 권리',
      paragraphs: [
        '이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있으며, 관련 문의는 아래 연락처를 통해 접수할 수 있습니다.',
        `이메일: ${CONTACT.EMAIL}`,
        `연락처: ${CONTACT.PHONE}`,
      ],
    },
    {
      title: '6. 고지 및 개정',
      paragraphs: [
        '본 방침은 관련 법령 및 서비스 변경 사항에 따라 개정될 수 있으며, 중요한 변경이 있는 경우 웹사이트 공지 또는 별도 안내를 통해 고지합니다.',
      ],
    },
  ],
};
