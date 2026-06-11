export type SmsBroadcastChannel = 'customer' | 'member' | 'individual' | 'petition';

export interface SmsRecipient {
  phone: string; // normalizeKoreanMobile 정규형 (01012345678)
  name: string | null;
  phoneHash: string; // hashPhone(phone) — sms_suppressions 차감용
}

export interface SmsAudienceResolver {
  // 채널별 수신자 목록 반환.
  // 구현체 책임: sms_suppressions 차감 + normalizeKoreanMobile 정규화 + 중복 제거.
  resolve(filter?: Record<string, unknown>): Promise<SmsRecipient[]>;
}
