// 뉴스레터 발송 채널 — 클라이언트 안전(서버 전용 import 없음).
// 발송 로직은 enqueue.ts(서버 전용)에 있고, client 컴포넌트(SendPanel)는 여기서 타입·라벨만 소비한다.

export type NewsletterChannel = 'customer' | 'member';

export const NEWSLETTER_CHANNELS: NewsletterChannel[] = ['customer', 'member'];

export const NEWSLETTER_CHANNEL_LABELS: Record<NewsletterChannel, string> = {
  customer: '고객 (수신동의·거래고객)',
  member: '작가·출품자',
};
