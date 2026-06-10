import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { hashPhone } from '@/lib/sms/phone-hash';

export interface SmsContact {
  phone: string;
  name: string | null;
}

export interface IndividualSmsRow {
  phone: string;
  name: string | null;
  status: 'pending';
}

// 직접 지정(individual) SMS 수신자를 정규화·중복제거·수신거부 차감한다.
// email admin-broadcast.ts L513-529의 인라인 로직을 SMS용 순수 헬퍼로 추출.
// isAdvertisement면 customer 채널 수신거부도 차감(개별 광고 발송 시 광고 거부 존중).
export async function resolveIndividualSmsRecipients(
  contacts: SmsContact[],
  isAdvertisement: boolean,

  supabase: SupabaseClient<any, any, any>
): Promise<IndividualSmsRow[]> {
  const channels = isAdvertisement ? ['individual', 'customer', 'all'] : ['individual', 'all'];
  const { data: suppressions } = await supabase
    .from('sms_suppressions')
    .select('phone_hash')
    .in('channel', channels);
  const suppressed = new Set((suppressions ?? []).map((s: { phone_hash: string }) => s.phone_hash));

  const seen = new Set<string>();
  const rows: IndividualSmsRow[] = [];
  for (const c of contacts) {
    const normalized = normalizeKoreanMobile(c.phone);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    if (suppressed.has(hashPhone(normalized))) continue;
    rows.push({ phone: normalized, name: c.name, status: 'pending' });
  }
  return rows;
}
