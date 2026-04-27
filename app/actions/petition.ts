'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { verifyHCaptcha } from '@/lib/petition/captcha';
import { sendPetitionReceipt } from '@/lib/petition/mail';
import { PETITION_OH_YOON_PATH, PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';
import { isValidRegionPair } from '@/lib/petition/regions';
import { SITE_URL } from '@/lib/constants';
import { getRequestMetadata } from './request-metadata';

export interface SignPetitionInput {
  fullName: string;
  email: string;
  regionTop: string;
  regionSub: string;
  isCommittee: boolean;
  message: string;
  messagePublic: boolean;
  agreedPetition: boolean;
  agreedPrivacy: boolean;
  agreedOverseas: boolean;
  hcaptchaToken: string;
}

export type SignPetitionResultCode =
  | 'OK'
  | 'INVALID_INPUT'
  | 'CAPTCHA_FAILED'
  | 'RATE_LIMITED'
  | 'DUPLICATE_EMAIL'
  | 'PETITION_CLOSED'
  | 'INTERNAL_ERROR';

export interface SignPetitionResult {
  ok: boolean;
  code: SignPetitionResultCode;
  errors?: Partial<Record<keyof SignPetitionInput, string>>;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(
  code: SignPetitionResultCode,
  message?: string,
  errors?: SignPetitionResult['errors']
): SignPetitionResult {
  return { ok: false, code, message, errors };
}

export async function signPetition(input: SignPetitionInput): Promise<SignPetitionResult> {
  // ─── 1. 입력 검증 ────────────────────────────────────────────
  const fullName = (input.fullName ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const regionTop = (input.regionTop ?? '').trim();
  const regionSub = (input.regionSub ?? '').trim();
  const message = (input.message ?? '').trim();

  const errors: SignPetitionResult['errors'] = {};
  if (fullName.length < 1 || fullName.length > 100) {
    errors.fullName = '성함을 1자 이상 100자 이하로 입력해 주십시오.';
  }
  if (!EMAIL_RE.test(email)) {
    errors.email = '이메일 주소 형식이 올바르지 않습니다.';
  }
  if (!isValidRegionPair(regionTop, regionSub)) {
    errors.regionTop = '거주 지역을 정확히 선택해 주십시오.';
  }
  if (message.length > 500) {
    errors.message = '메시지는 500자 이내로 작성해 주십시오.';
  }
  if (!input.agreedPetition) {
    errors.agreedPetition = '청원 동의는 필수입니다.';
  }
  if (!input.agreedPrivacy) {
    errors.agreedPrivacy = '개인정보 수집·이용 동의는 필수입니다.';
  }
  if (!input.agreedOverseas) {
    errors.agreedOverseas = '국외 이전 동의는 필수입니다.';
  }
  if (Object.keys(errors).length > 0) {
    return fail('INVALID_INPUT', '입력을 확인해 주십시오.', errors);
  }

  // ─── 2. 요청 메타 + rate-limit ─────────────────────────────────
  const meta = await getRequestMetadata();
  const ipKey = meta.ip ?? 'unknown-ip';
  const limit = await rateLimit(`petition:sign:${ipKey}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.success) {
    return fail('RATE_LIMITED', '요청이 너무 잦습니다. 잠시 후 다시 시도해 주십시오.');
  }

  // ─── 3. hCaptcha 검증 ─────────────────────────────────────────
  const captcha = await verifyHCaptcha(input.hcaptchaToken, meta.ip ?? null);
  if (!captcha.ok) {
    return fail('CAPTCHA_FAILED', '봇 차단 검증에 실패했습니다. 다시 시도해 주십시오.');
  }

  // ─── 4. sign_petition RPC 호출 ────────────────────────────────
  const supabase = createSupabaseAdminClient();
  const payload = {
    petition_slug: PETITION_OH_YOON_SLUG,
    full_name: fullName,
    email,
    region_top: regionTop,
    region_sub: regionSub || null,
    is_committee: input.isCommittee === true,
    message: message || null,
    message_public: input.messagePublic === true && message.length > 0,
    agreed_petition: true,
    agreed_privacy: true,
    agreed_overseas: true,
    user_agent: meta.userAgent,
    ip: meta.ip,
  };

  const { data, error } = await supabase.rpc('sign_petition', {
    p_payload: payload,
  });

  if (error) {
    console.error('[petition/sign] RPC error:', error);
    return fail('INTERNAL_ERROR', '저장 중 오류가 발생했습니다.');
  }

  const rpcResult = data as { ok: boolean; code?: string; id?: string } | null;

  if (!rpcResult?.ok) {
    if (rpcResult?.code === 'DUPLICATE_EMAIL') {
      return fail('DUPLICATE_EMAIL', '이미 서명하셨습니다. 영수증 메일을 확인해 주세요.');
    }
    if (rpcResult?.code === 'PETITION_CLOSED') {
      return fail('PETITION_CLOSED', '서명이 마감되었습니다.');
    }
    return fail('INTERNAL_ERROR', '저장에 실패했습니다.');
  }

  // ─── 5. 영수증 메일 (실패해도 서명 자체는 성공으로 응답) ─────
  void sendPetitionReceipt({
    to: email,
    fullName,
    petitionUrl: `${SITE_URL}${PETITION_OH_YOON_PATH}`,
  }).catch((err) => console.error('[petition/sign] receipt enqueue failed:', err));

  // ─── 6. ISR 카운터 즉시 갱신 ─────────────────────────────────
  try {
    revalidatePath(PETITION_OH_YOON_PATH);
    revalidatePath(`/ko${PETITION_OH_YOON_PATH}`);
    revalidatePath(`/en${PETITION_OH_YOON_PATH}`);
  } catch {
    /* revalidate는 best-effort */
  }

  return { ok: true, code: 'OK' };
}
