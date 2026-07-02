import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

import { AdSenderInfo, UnsubscribeLink } from './_components/legal-footer';
import type { EmailLocale } from './_components/i18n';
import { BRAND_COLORS } from '@/lib/colors';
import { CONTACT } from '@/lib/constants';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

export interface NewsletterEmailProps {
  issueNo: number;
  title: string;
  preheader: string;
  blocks: NewsletterBlock[];
  isAdvertisement: boolean;
  unsubscribeUrl: string;
  webUrl: string;
  locale?: EmailLocale;
}

/**
 * 월간 뉴스레터 템플릿 — 갤러리 화이트 큐브 톤의 600px 단일 컬럼 매거진.
 * 블록 배열(lib/newsletter/blocks.ts)을 순서대로 렌더. (광고) 제목 접두어는
 * 디스패처(broadcast-dispatch)가 subject에 부여 — 본문은 AdSenderInfo로 충족.
 */
export default function NewsletterEmail({
  issueNo,
  title,
  preheader,
  blocks,
  isAdvertisement,
  unsubscribeUrl,
  webUrl,
  locale = 'ko',
}: NewsletterEmailProps) {
  return (
    <Html lang={locale}>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preheader || title}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={{ padding: '10px 28px 0', textAlign: 'center' }}>
            <Link href={webUrl} style={viewOnWebStyle}>
              {locale === 'en'
                ? 'View this issue on the web'
                : '메일이 잘 안 보이나요? 웹에서 보기'}
            </Link>
          </Section>

          <Section style={{ padding: '20px 28px 0', textAlign: 'center' }}>
            <Text style={mastheadEyebrowStyle}>
              SEED ART FESTIVAL · {locale === 'en' ? `Issue ${issueNo}` : `제${issueNo}호`}
            </Text>
            <Text style={mastheadTitleStyle}>{title}</Text>
          </Section>
          <Hr style={hairlineStyle} />

          {blocks.map((block) => (
            <NewsletterBlockSection key={block.id} block={block} />
          ))}

          {isAdvertisement && (
            <Section style={{ padding: '0 28px' }}>
              <AdSenderInfo locale={locale} />
            </Section>
          )}
          <UnsubscribeLink href={unsubscribeUrl} locale={locale} />
          <Section style={{ padding: '4px 28px 24px', textAlign: 'center' }}>
            <Text style={footerBrandStyle}>
              {locale === 'en' ? 'SAF 2026' : '씨앗페 SAF 2026'} · {CONTACT.EMAIL}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function NewsletterBlockSection({ block }: { block: NewsletterBlock }) {
  switch (block.type) {
    case 'cover':
      return (
        <Section style={{ padding: '20px 0 4px' }}>
          {block.imageUrl && (
            <Img src={block.imageUrl} alt={block.title} width={600} style={fullImageStyle} />
          )}
          <Section style={{ padding: '16px 28px 0', textAlign: 'center' }}>
            <Text style={coverTitleStyle}>{block.title}</Text>
            {block.subtitle && <Text style={coverSubtitleStyle}>{block.subtitle}</Text>}
          </Section>
        </Section>
      );
    case 'text':
      return (
        <Section style={{ padding: '12px 28px' }}>
          <div style={richTextStyle} dangerouslySetInnerHTML={{ __html: block.html }} />
        </Section>
      );
    case 'artworkCard':
      return (
        <Section style={{ padding: '16px 28px' }}>
          <Section style={artworkCardStyle}>
            <Img
              src={block.snapshot.imageUrl}
              alt={block.snapshot.title}
              width={542}
              style={artworkImageStyle}
            />
            <Section style={{ padding: '16px 20px 20px' }}>
              <Text style={artworkArtistStyle}>{block.snapshot.artistName}</Text>
              <Text style={artworkTitleStyle}>{block.snapshot.title}</Text>
              {block.snapshot.description && (
                <Text style={artworkDescStyle}>{block.snapshot.description}</Text>
              )}
              {block.showPrice && block.snapshot.price && (
                <Text style={artworkPriceStyle}>{block.snapshot.price}</Text>
              )}
              <Link href={block.snapshot.url} style={artworkLinkStyle}>
                작품 보러가기 →
              </Link>
            </Section>
          </Section>
        </Section>
      );
    case 'eventBanner':
      return (
        <Section style={{ padding: '16px 28px' }}>
          <Section style={eventBannerStyle}>
            {block.imageUrl && (
              <Img src={block.imageUrl} alt={block.title} width={542} style={eventImageStyle} />
            )}
            <Section style={{ padding: '20px 20px 24px', textAlign: 'center' }}>
              <Text style={eventTitleStyle}>{block.title}</Text>
              {block.dateText && <Text style={eventDateStyle}>{block.dateText}</Text>}
              <Button href={block.ctaUrl} style={ctaButtonStyle}>
                {block.ctaLabel}
              </Button>
            </Section>
          </Section>
        </Section>
      );
    case 'button':
      return (
        <Section style={{ padding: '16px 28px', textAlign: 'center' }}>
          <Button href={block.url} style={ctaButtonStyle}>
            {block.label}
          </Button>
        </Section>
      );
    case 'divider':
      return <Hr style={hairlineStyle} />;
  }
}

const bodyStyle: React.CSSProperties = {
  margin: '0',
  padding: '0',
  background: BRAND_COLORS.canvas.DEFAULT,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '24px auto',
  background: BRAND_COLORS.canvas.soft,
  border: `1px solid ${BRAND_COLORS.gallery.hairline}`,
};

const viewOnWebStyle: React.CSSProperties = {
  fontSize: '12px',
  color: BRAND_COLORS.charcoal.soft,
  textDecoration: 'underline',
};

const mastheadEyebrowStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: BRAND_COLORS.charcoal.muted,
};

const mastheadTitleStyle: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: '1.3',
  color: BRAND_COLORS.charcoal.deep,
};

const hairlineStyle: React.CSSProperties = {
  margin: '8px 28px',
  borderTop: `1px solid ${BRAND_COLORS.gallery.divider}`,
};

const fullImageStyle: React.CSSProperties = { width: '100%', height: 'auto', display: 'block' };

const coverTitleStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '26px',
  fontWeight: 700,
  lineHeight: '1.3',
  color: BRAND_COLORS.charcoal.deep,
};

const coverSubtitleStyle: React.CSSProperties = {
  margin: '0',
  fontSize: '15px',
  color: BRAND_COLORS.charcoal.muted,
  lineHeight: '1.6',
};

const richTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.8',
  color: BRAND_COLORS.charcoal.DEFAULT,
};

const artworkCardStyle: React.CSSProperties = {
  border: `1px solid ${BRAND_COLORS.gallery.hairline}`,
  background: BRAND_COLORS.canvas.soft,
};

const artworkImageStyle: React.CSSProperties = { width: '100%', height: 'auto', display: 'block' };

const artworkArtistStyle: React.CSSProperties = {
  margin: '0 0 2px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: BRAND_COLORS.charcoal.muted,
};

const artworkTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '18px',
  fontWeight: 700,
  color: BRAND_COLORS.charcoal.deep,
};

const artworkDescStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '14px',
  lineHeight: '1.7',
  color: BRAND_COLORS.charcoal.DEFAULT,
};

const artworkPriceStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '14px',
  fontWeight: 700,
  color: BRAND_COLORS.sun.strong,
};

const artworkLinkStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: BRAND_COLORS.primary.strong,
  textDecoration: 'none',
};

const eventBannerStyle: React.CSSProperties = {
  background: BRAND_COLORS.gallery.tile,
};

const eventImageStyle: React.CSSProperties = { width: '100%', height: 'auto', display: 'block' };

const eventTitleStyle: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: '20px',
  fontWeight: 700,
  color: BRAND_COLORS.light,
};

const eventDateStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '13px',
  color: BRAND_COLORS.gray[300],
};

const ctaButtonStyle: React.CSSProperties = {
  background: BRAND_COLORS.primary.strong,
  color: BRAND_COLORS.light,
  padding: '12px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
};

const footerBrandStyle: React.CSSProperties = {
  margin: '0',
  fontSize: '12px',
  color: BRAND_COLORS.gray[400],
};
