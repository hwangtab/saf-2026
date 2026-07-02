// 정통망법 §50 발송자 정보 + 수신거부 링크 — broadcast/newsletter 등 광고성 메일 공용.
// 법적 문구·조직 정보가 바뀔 때 한 곳만 수정하도록 추출.
import { Link, Section, Text } from '@react-email/components';
import * as React from 'react';

import type { EmailLocale } from './i18n';
import { CONTACT } from '@/lib/constants';
import { BRAND_COLORS } from '@/lib/colors';

export function AdSenderInfo({ locale = 'ko' }: { locale?: EmailLocale }) {
  return (
    <Section style={adFooterBoxStyle}>
      <Text style={adFooterLabelText}>
        {locale === 'en' ? 'Advertiser Information' : '[광고] 발송사 정보'}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? 'CEO: ' : '대표자: '}
        {locale === 'en' ? CONTACT.REPRESENTATIVE_NAME_EN : CONTACT.REPRESENTATIVE_NAME}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? 'Business Registration: ' : '사업자등록번호: '}
        {CONTACT.BUSINESS_REGISTRATION_NUMBER}
      </Text>
      {locale === 'en' ? (
        <>
          <Text style={adFooterTextStyle}>{CONTACT.MAIL_ORDER_REPORT_NUMBER_EN}</Text>
          <Text style={adFooterTextStyle}>{CONTACT.ADDRESS_EN}</Text>
        </>
      ) : (
        <>
          <Text style={adFooterTextStyle}>통신판매신고: {CONTACT.MAIL_ORDER_REPORT_NUMBER}</Text>
          <Text style={adFooterTextStyle}>
            {CONTACT.ADDRESS} ({CONTACT.POSTAL_CODE})
          </Text>
        </>
      )}
      <Text style={adFooterTextStyle}>
        {locale === 'en' ? 'Phone: ' : '전화: '}
        {CONTACT.PHONE} | {locale === 'en' ? 'Email: ' : '이메일: '}
        {CONTACT.EMAIL}
      </Text>
      <Text style={adFooterTextStyle}>
        {locale === 'en'
          ? 'You may unsubscribe from these advertising emails for free at any time using the link below.'
          : '본 광고 메일은 아래 링크를 통해 언제든지 무료로 수신거부할 수 있습니다.'}
      </Text>
    </Section>
  );
}

export function UnsubscribeLink({ href, locale = 'ko' }: { href: string; locale?: EmailLocale }) {
  return (
    <Section style={unsubscribeSectionStyle}>
      <Link href={href} style={unsubscribeLinkStyle}>
        {locale === 'en' ? 'Unsubscribe from this mailing list' : '이메일 수신거부 및 구독취소'}
      </Link>
    </Section>
  );
}

const adFooterBoxStyle: React.CSSProperties = {
  marginTop: '24px',
  marginBottom: '16px',
  padding: '12px 16px',
  background: BRAND_COLORS.canvas.DEFAULT,
  border: `1px solid ${BRAND_COLORS.gallery.hairline}`,
  borderRadius: '6px',
};

const adFooterLabelText: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '12px',
  fontWeight: 700,
  color: BRAND_COLORS.charcoal.deep,
};

const adFooterTextStyle: React.CSSProperties = {
  margin: '2px 0',
  fontSize: '11px',
  color: BRAND_COLORS.charcoal.soft,
  lineHeight: '1.5',
};

const unsubscribeSectionStyle: React.CSSProperties = {
  marginTop: '16px',
  textAlign: 'center',
};

const unsubscribeLinkStyle: React.CSSProperties = {
  fontSize: '12px',
  color: BRAND_COLORS.charcoal.muted,
  textDecoration: 'underline',
};
