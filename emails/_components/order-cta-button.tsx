import { Button, Section } from '@react-email/components';
import * as React from 'react';

import { t, type EmailLocale } from './i18n';

/**
 * 이메일 본문의 "주문 상세 보기" CTA. href에는 서명 토큰 링크(/orders?token=...)가 들어가며,
 * 클릭하면 로그인·재입력 없이 주문 상세로 직행한다. href가 없으면(토큰 secret 미설정 등)
 * 호출부에서 렌더 자체를 생략한다.
 */
export default function OrderCtaButton({
  href,
  locale = 'ko',
}: {
  href: string;
  locale?: EmailLocale;
}) {
  return (
    <Section style={sectionStyle}>
      <Button href={href} style={buttonStyle}>
        {t('viewOrderDetail', locale)}
      </Button>
    </Section>
  );
}

const sectionStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '24px',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#0E4ECF',
  color: '#FFFFFF',
  textDecoration: 'none',
  padding: '12px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
};
