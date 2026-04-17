import { Link, Text } from '@react-email/components';
import * as React from 'react';

import type { EmailLocale } from './i18n';

interface TrackingInfoProps {
  carrier: string;
  trackingNumber?: string;
  locale?: EmailLocale;
}

const CARRIER_TRACKING_URLS: Record<string, string> = {
  CJ대한통운: 'https://trace.cjlogistics.com/next/tracking.html?wblNo=',
  롯데택배: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=',
  한진택배:
    'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillSch.do?mCode=MN038&schLang=KOR&wblnumText2=',
  우체국택배: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=',
  로젠택배: 'https://www.ilogen.com/m/personal/trace/',
  카카오택배: 'https://accounts.kakao.com/',
};

export default function TrackingInfo({
  carrier,
  trackingNumber,
  locale = 'ko',
}: TrackingInfoProps) {
  const trackingUrl =
    trackingNumber && CARRIER_TRACKING_URLS[carrier]
      ? `${CARRIER_TRACKING_URLS[carrier]}${trackingNumber}`
      : null;
  const carrierLabel = locale === 'en' ? 'Carrier' : '택배사';
  const trackingLabel = locale === 'en' ? 'Tracking No.' : '운송장 번호';

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        overflow: 'hidden',
        marginTop: '12px',
      }}
    >
      <tbody>
        <tr>
          <td style={tdKeyStyle}>{carrierLabel}</td>
          <td style={tdValStyle}>{carrier}</td>
        </tr>
        {trackingNumber && (
          <tr>
            <td style={tdKeyStyle}>{trackingLabel}</td>
            <td style={tdValStyle}>
              {trackingUrl ? (
                <Link href={trackingUrl} style={linkStyle}>
                  {trackingNumber}
                </Link>
              ) : (
                <Text style={{ margin: '0' }}>{trackingNumber}</Text>
              )}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

const tdKeyStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontWeight: '600',
  color: '#374151',
  background: '#f9fafb',
  width: '110px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
};

const tdValStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: '#111827',
  borderBottom: '1px solid #f3f4f6',
};

const linkStyle: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'underline',
};
