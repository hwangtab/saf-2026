import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';

interface SAFEmailLayoutProps {
  headerColor: string;
  headerTitle: string;
  previewText: string;
  children: React.ReactNode;
}

export default function SAFEmailLayout({
  headerColor,
  headerTitle,
  previewText,
  children,
}: SAFEmailLayoutProps) {
  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  return (
    <Html lang="ko">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={{ background: headerColor, padding: '20px 28px' }}>
            <Text style={headerTextStyle}>{headerTitle}</Text>
          </Section>
          <Section style={{ padding: '20px 28px 8px' }}>{children}</Section>
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>씨앗페 2026 • {timestamp}</Text>
            <Text style={{ ...footerTextStyle, marginTop: '4px' }}>문의: contact@kosmart.org</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  margin: '0',
  padding: '0',
  background: '#f9fafb',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '32px auto',
  background: '#fff',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const headerTextStyle: React.CSSProperties = {
  margin: '0',
  fontSize: '20px',
  fontWeight: '700',
  color: '#fff',
};

const footerStyle: React.CSSProperties = {
  padding: '12px 28px 20px',
  background: '#f9fafb',
  borderTop: '1px solid #f3f4f6',
  marginTop: '12px',
};

const footerTextStyle: React.CSSProperties = {
  margin: '0',
  fontSize: '12px',
  color: '#9ca3af',
};
