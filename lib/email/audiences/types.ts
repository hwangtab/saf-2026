export type BroadcastChannel = 'customer' | 'member' | 'petition' | 'individual';

export interface Recipient {
  email: string;
  name: string | null;
  locale: 'ko' | 'en';
  emailHash: string; // hashEmail(email) — suppression 체크·unsubscribe 토큰용
}

export interface AudienceResolver {
  // 채널별 수신자 목록 반환.
  // 구현체 책임: email_suppressions 차감 + 이메일 정규화 중복 제거.
  resolve(filter?: Record<string, unknown>): Promise<Recipient[]>;
}
