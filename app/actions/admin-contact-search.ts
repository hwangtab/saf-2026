'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { hashEmail } from '@/lib/email/email-hash';

export interface ContactSearchResult {
  email: string;
  name: string | null;
  sources: string[];
  suppressed: boolean;
}

const LIMIT = 50;

// 보유 연락처(구매자·서명자·작가·출품자/회원)를 이름·이메일로 검색.
// 외부 임의 주소 추가 아님 — 이미 보유한 연락처만. suppression(individual+all)은 플래그로 표시.
export async function searchContacts(
  query: string
): Promise<{ results: ContactSearchResult[]; truncated: boolean }> {
  await requireAdmin();
  const q = query.trim();
  if (!q) return { results: [], truncated: false };

  // PostgREST .or() 필터 문자열 인젝션 방지: 필터 구문 경계 문자(쉼표·괄호·별표)를 제거.
  // 이메일 검색을 위해 '.'·'@'는 보존. 남은 문자열에서 LIKE 와일드카드(% _)만 이스케이프.
  const sanitized = q
    .replace(/[,()*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) return { results: [], truncated: false };

  const supabase = await requireAdminClient();
  const like = `%${sanitized.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  let sourceCapped = false;
  const merged = new Map<string, { name: string | null; sources: Set<string> }>();
  const add = (
    email: string | null | undefined,
    name: string | null | undefined,
    source: string
  ) => {
    if (!email) return;
    const norm = email.toLowerCase().trim();
    if (!norm) return;
    const cur = merged.get(norm) ?? { name: null, sources: new Set<string>() };
    if (!cur.name && name) cur.name = name;
    cur.sources.add(source);
    merged.set(norm, cur);
  };

  // 1) 구매자
  const { data: orders } = await supabase
    .from('orders')
    .select('buyer_email, buyer_name')
    .or(`buyer_name.ilike.${like},buyer_email.ilike.${like}`)
    .limit(LIMIT);
  if ((orders?.length ?? 0) >= LIMIT) sourceCapped = true;
  for (const o of orders ?? []) add(o.buyer_email as string, o.buyer_name as string, '구매자');

  // 2) 서명자 (마스킹 제외)
  const { data: signers } = await supabase
    .from('petition_signatures')
    .select('email, full_name')
    .eq('is_masked', false)
    .or(`full_name.ilike.${like},email.ilike.${like}`)
    .limit(LIMIT);
  if ((signers?.length ?? 0) >= LIMIT) sourceCapped = true;
  for (const s of signers ?? []) add(s.email as string, s.full_name as string, '서명자');

  // 3) 작가
  const { data: artists } = await supabase
    .from('artists')
    .select('contact_email, name_ko, name_en')
    .or(`name_ko.ilike.${like},name_en.ilike.${like},contact_email.ilike.${like}`)
    .limit(LIMIT);
  if ((artists?.length ?? 0) >= LIMIT) sourceCapped = true;
  for (const a of artists ?? [])
    add(a.contact_email as string, (a.name_ko as string) ?? (a.name_en as string), '작가');

  // 4) 회원(작가·출품자 프로필)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email, name, role')
    .in('role', ['artist', 'exhibitor'])
    .not('email', 'is', null)
    .or(`name.ilike.${like},email.ilike.${like}`)
    .limit(LIMIT);
  if ((profiles?.length ?? 0) >= LIMIT) sourceCapped = true;
  for (const p of profiles ?? [])
    add(p.email as string, p.name as string, p.role === 'exhibitor' ? '출품자' : '회원');

  // suppression(individual+all) 플래그
  const { data: suppressions } = await supabase
    .from('email_suppressions')
    .select('email_hash')
    .in('channel', ['individual', 'all']);
  const suppressed = new Set((suppressions ?? []).map((s) => s.email_hash as string));

  const all = [...merged.entries()].map(([email, v]) => ({
    email,
    name: v.name,
    sources: [...v.sources],
    suppressed: suppressed.has(hashEmail(email)),
  }));

  return { results: all.slice(0, LIMIT), truncated: sourceCapped || all.length > LIMIT };
}
