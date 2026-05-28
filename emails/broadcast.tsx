import { Button, Link, Section, Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import type { EmailLocale } from './_components/i18n';
import { CONTACT } from '@/lib/constants';

export interface BroadcastEmailProps {
  channel: 'customer' | 'member' | 'petition';
  recipientName: string | null;
  subject: string;
  bodyParagraphs: string[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  unsubscribeUrl: string;
  locale?: EmailLocale;
}

/**
 * 브로드캐스트 이메일 템플릿 — 고객(광고)/작가/청원 채널별 지원.
 *
 * 채널별 특징:
 * - 'customer': 정통망법 §50 발송자 정보 푸터 표시 + 제목에 "(광고)" 접두어
 * - 'member'/'petition': 간단한 푸터 (브랜드 + 연락처)
 *
 * i18n 미적용 — broadcast 이메일은 DB/API에서 locale을 명시적으로 결정.
 */
export default function BroadcastEmail({
  channel,
  recipientName,
  subject,
  bodyParagraphs,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
  locale = 'ko',
}: BroadcastEmailProps) {
  const isAd = channel === 'customer';

  const headerTitle =
    locale === 'en'
      ? isAd
        ? `(Advertisement) ${subject}`
        : subject
      : isAd
        ? `(광고) ${subject}`
        : subject;

  const greeting =
    locale === 'en'
      ? recipientName
        ? `Dear ${recipientName},`
        : 'Hello,'
      : recipientName
        ? `${recipientName}님,`
        : '안녕하세요,';

  const unsubscribeText =
    locale === 'en' ? 'Unsubscribe from this mailing list' : '이메일 수신거부 및 구독취소';

  // 'customer' 채널 시 헤더 색상을 primary 블루로 → 광고임을 명시
  const headerColor = isAd ? '#0E4ECF' : '#2176FF';

  return (
    <SAFEmailLayout
      headerColor={headerColor}
      headerTitle={headerTitle}
      previewText={headerTitle}
      locale={locale}
    >
      <Text style={greetingText}>{greeting}</Text>

      {bodyParagraphs.map((para, i) => (
        <Text key={i} style={bodyText}>
          {para}
        </Text>
      ))}

      {/* CTA URL은 admin-broadcast.ts의 validateUrl이 이미 검증하지만, 향후 DB 직접 수정/마이그레이션
          오류로 javascript:/data: URI가 들어올 수 있으므로 컴포넌트 레벨 2차 방어. */}
      {ctaLabel && ctaUrl && /^https?:\/\//i.test(ctaUrl) && (
        <Section style={ctaWrapperStyle}>
          <Button
            href={ctaUrl}
            style={{
              ...ctaButtonStyle,
            }}
          >
            {ctaLabel}
          </Button>
        </Section>
      )}

      {/* 'customer' 채널 시 정통망법 발송자 정보 */}
      {isAd && (
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
              <Text style={adFooterTextStyle}>
                통신판매신고: {CONTACT.MAIL_ORDER_REPORT_NUMBER}
              </Text>
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
        </Section>
      )}

      {/* 수신거부 링크 */}
      <Section style={unsubscribeSectionStyle}>
        <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>
          {unsubscribeText}
        </Link>
      </Section>
    </SAFEmailLayout>
  );
}

const greetingText: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '15px',
  fontWeight: 500,
  color: '#1F2428',
};

const bodyText: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: '14px',
  lineHeight: '1.7',
  color: '#555E67',
};

const ctaWrapperStyle: React.CSSProperties = {
  margin: '24px 0 8px',
  textAlign: 'center',
};

const ctaButtonStyle: React.CSSProperties = {
  background: '#2176FF',
  color: '#FFFFFF',
  padding: '12px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
};

const adFooterBoxStyle: React.CSSProperties = {
  marginTop: '24px',
  marginBottom: '16px',
  padding: '12px 16px',
  background: '#FAFAFC',
  border: '1px solid #E0E0E0',
  borderRadius: '6px',
};

const adFooterLabelText: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '12px',
  fontWeight: 700,
  color: '#1F2428',
};

const adFooterTextStyle: React.CSSProperties = {
  margin: '2px 0',
  fontSize: '11px',
  color: '#6A7378',
  lineHeight: '1.5',
};

const unsubscribeSectionStyle: React.CSSProperties = {
  marginTop: '16px',
  textAlign: 'center',
};

const unsubscribeLinkStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555E67',
  textDecoration: 'underline',
};
