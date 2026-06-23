'use server';

import { createHash } from 'crypto';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';

import { getRequestMetadata } from './request-metadata';

export interface CreatePledgeInput {
  projectSlug: string;
  rewardTierId: string;
  quantity: number;
  backerName: string;
  backerEmail: string;
  backerPhone: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingPostalCode?: string;
  shippingMemo?: string;
  isAnonymous?: boolean;
  supporterMessage?: string;
  messagePublic?: boolean;
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  agreedWithdrawalWaiver?: boolean;
}

export type CreatePledgeResultCode =
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'PROJECT_CLOSED'
  | 'TIER_SOLD_OUT'
  | 'INTERNAL_ERROR';

export type CreatePledgeResult =
  | { ok: true; orderNo: string; amount: number }
  | { ok: false; code: CreatePledgeResultCode };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export async function createPledge(input: CreatePledgeInput): Promise<CreatePledgeResult> {
  // ─── 1. 입력 검증 ────────────────────────────────────────────
  const backerName = (input.backerName ?? '').trim();
  const phoneDigits = (input.backerPhone ?? '').replace(/\D/g, '');

  if (
    !input.agreedTerms ||
    !input.agreedPrivacy ||
    backerName.length < 1 ||
    backerName.length > 100 ||
    !EMAIL_RE.test(input.backerEmail ?? '') ||
    phoneDigits.length < 9 ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 50 ||
    (input.supporterMessage?.length ?? 0) > 500
  ) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  // ─── 2. 요청 메타 + rate-limit ─────────────────────────────────
  const meta = await getRequestMetadata();
  const ipKey = meta.ip ?? 'unknown-ip';
  const limit = await rateLimit(`funding:pledge:${ipKey}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.success) {
    return { ok: false, code: 'RATE_LIMITED' };
  }

  // ─── 3. create_funding_pledge RPC 호출 ──────────────────────────
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('create_funding_pledge', {
    p_payload: {
      project_slug: input.projectSlug,
      reward_tier_id: input.rewardTierId,
      quantity: input.quantity,
      backer_name: backerName,
      backer_email: input.backerEmail,
      backer_phone: input.backerPhone,
      shipping_name: input.shippingName ?? '',
      shipping_phone: input.shippingPhone ?? '',
      shipping_address: input.shippingAddress ?? '',
      shipping_postal_code: input.shippingPostalCode ?? '',
      shipping_memo: input.shippingMemo ?? '',
      is_anonymous: input.isAnonymous ?? false,
      supporter_message: input.supporterMessage ?? '',
      message_public: input.messagePublic ?? false,
      agreed_terms: input.agreedTerms,
      agreed_privacy: input.agreedPrivacy,
      agreed_withdrawal_waiver: input.agreedWithdrawalWaiver ?? false,
      user_agent: meta.userAgent ?? null,
      ip_hash: hashIp(ipKey),
    },
  });

  // ─── 4. RPC 결과 매핑 ──────────────────────────────────────────
  const r = data as { ok: boolean; code?: string; order_no?: string; amount?: number } | null;

  if (error || !r) {
    return { ok: false, code: 'INTERNAL_ERROR' };
  }

  if (!r.ok) {
    if (r.code === 'PROJECT_CLOSED' || r.code === 'PROJECT_NOT_FOUND') {
      return { ok: false, code: 'PROJECT_CLOSED' };
    }
    if (r.code === 'TIER_SOLD_OUT' || r.code === 'TIER_NOT_FOUND') {
      return { ok: false, code: 'TIER_SOLD_OUT' };
    }
    return { ok: false, code: 'INVALID_INPUT' };
  }

  return { ok: true, orderNo: r.order_no!, amount: r.amount! };
}
