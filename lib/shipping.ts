export const CARRIERS: { value: string; label: string }[] = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'epost', label: '우체국택배' },
  { value: 'logen', label: '로젠택배' },
  { value: 'cu', label: 'CU편의점택배' },
  { value: 'direct', label: '직접배송' },
  { value: 'other', label: '기타' },
];

const CARRIER_TRACKING_URLS: Record<string, string> = {
  cj: 'https://trace.cjlogistics.com/next/tracking.html?wblNo=',
  hanjin: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mession_cd=1&wblnb=',
  lotte: 'https://www.lotteglogis.com/home/reservation/tracking/link498/',
  epost: 'https://service.epost.go.kr/trace.RetrieveDomRi498.postal?sid1=',
  logen: 'https://www.ilogen.com/web/personal/trace/',
};

export function getCarrierLabel(value: string): string {
  return CARRIERS.find((c) => c.value === value)?.label ?? value;
}

export function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const base = CARRIER_TRACKING_URLS[carrier];
  if (!base) return null;
  return `${base}${encodeURIComponent(trackingNumber)}`;
}
