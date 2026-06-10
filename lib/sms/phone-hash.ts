import crypto from 'crypto';

import { PETITION_SALT } from '@/lib/email/email-hash';
import { normalizeKoreanMobile } from '@/lib/sms/phone';

// SMS 수신거부(sms_suppressions.phone_hash) 매칭·발송 로그 키용 전화번호 해시.
// email-hash.ts의 salt 스킴을 재사용 — 단일 PETITION_SALT로 이메일·전화 해시를 통일 관리.
// normalizeKoreanMobile로 010 정규형(01012345678)으로 수렴시킨 뒤 해싱하므로
// 하이픈·공백·+82 변형이 모두 동일 해시가 된다. 비-010은 raw-trim fallback(안정적·throw 없음).
export function hashPhone(phone: string): string {
  const normalized = normalizeKoreanMobile(phone) ?? phone.trim();
  return crypto
    .createHash('sha256')
    .update(PETITION_SALT + normalized)
    .digest('hex');
}
