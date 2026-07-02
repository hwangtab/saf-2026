import { Button, Section } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import { AdSenderInfo, UnsubscribeLink } from './_components/legal-footer';
import type { EmailLocale } from './_components/i18n';

export interface BroadcastEmailProps {
  channel: 'customer' | 'member' | 'petition' | 'individual';
  isAdvertisement: boolean;
  recipientName: string | null;
  subject: string;
  bodyHtml: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  unsubscribeUrl: string;
  locale?: EmailLocale;
}

/**
 * 브로드캐스트 이메일 템플릿 — 고객(광고)/작가/청원 채널별 지원.
 *
 * 광고 여부는 isAdvertisement prop(← DB email_broadcasts.is_advertisement)으로 결정:
 * - isAdvertisement=true: 정통망법 §50 발송자 정보 푸터 + 제목에 "(광고)" 접두어
 * - isAdvertisement=false: 간단한 푸터 (브랜드 + 연락처)
 * 채널: 'customer' | 'member' | 'petition' | 'individual' (수신거부 토큰 스코프용)
 *
 * i18n 미적용 — broadcast 이메일은 DB/API에서 locale을 명시적으로 결정.
 */
export default function BroadcastEmail({
  channel: _channel,
  isAdvertisement,
  subject,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
  locale = 'ko',
}: BroadcastEmailProps) {
  const isAd = isAdvertisement;

  const headerTitle =
    locale === 'en'
      ? isAd
        ? `(Advertisement) ${subject}`
        : subject
      : isAd
        ? `(광고) ${subject}`
        : subject;

  // 광고(isAdvertisement=true) 시 헤더 색상을 primary-strong 블루로 → 광고임을 명시
  const headerColor = isAd ? '#0E4ECF' : '#2176FF';

  return (
    <SAFEmailLayout
      headerColor={headerColor}
      headerTitle={headerTitle}
      previewText={headerTitle}
      locale={locale}
    >
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />

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

      {/* 광고(isAdvertisement=true) 시 정통망법 발송자 정보 */}
      {isAd && <AdSenderInfo locale={locale} />}

      {/* 수신거부 링크 */}
      <UnsubscribeLink href={unsubscribeUrl} locale={locale} />
    </SAFEmailLayout>
  );
}

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
