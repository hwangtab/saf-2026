/** @jest-environment node */
import { updateMarketingConsent } from '@/app/actions/mypage';
import { hashPhone } from '@/lib/sms/phone-hash';
import { hashEmail } from '@/lib/email/email-hash';

// ── 서버 클라이언트 mocks ────────────────────────────────────────────────
const mockServerFrom = jest.fn();
const mockAdminFrom = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'u-test' } }, error: null }),
    },
    from: mockServerFrom,
  })),
  createSupabaseAdminClient: jest.fn(() => ({
    from: mockAdminFrom,
  })),
}));

// ── 헬퍼: 모든 메서드를 지원하고 awaitable한 범용 supabase chain ──────────
// terminal 값(result)은 .single()/.maybeSingle() 및 직접 await(then) 모두에서 반환.
function makeChain(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  for (const m of ['update', 'delete', 'select', 'eq', 'in', 'not']) {
    chain[m] = jest.fn(() => chain);
  }
  chain.upsert = jest.fn(async () => result);
  chain.single = jest.fn(async () => result);
  chain.maybeSingle = jest.fn(async () => result);
  (chain as unknown as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (
    resolve
  ) => {
    resolve(result);
    return Promise.resolve(result);
  };
  return chain;
}

// server client: 1번째 profiles 호출=update, 2번째=select(email,phone).
function setupServer(profile: Record<string, unknown> | null) {
  let n = 0;
  mockServerFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      n += 1;
      return n === 1 ? makeChain({ error: null }) : makeChain({ data: profile, error: null });
    }
    return makeChain({ error: null });
  });
}

describe('updateMarketingConsent', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('동의 해제(consent=false)', () => {
    it('이메일+010+주문이메일 → email/sms_suppressions upsert (M6: 주문 이메일도 차단)', async () => {
      setupServer({ email: 'test@example.com', phone: '01012345678' });

      const ordersChain = makeChain({
        data: [{ buyer_email: 'order@example.com' }],
        error: null,
      });
      const emailUpsertChain = makeChain({ error: null });
      const smsUpsertChain = makeChain({ error: null });
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'orders') return ordersChain;
        if (table === 'email_suppressions') return emailUpsertChain;
        if (table === 'sms_suppressions') return smsUpsertChain;
        return makeChain({ error: null });
      });

      const result = await updateMarketingConsent(false);
      expect(result.error).toBeUndefined();

      // sms_suppressions upsert가 정확한 shape으로 호출됐는지 검증
      expect(smsUpsertChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_hash: hashPhone('01012345678'),
          channel: 'customer',
          reason: 'unsubscribe',
        }),
        expect.objectContaining({ onConflict: 'phone_hash,channel', ignoreDuplicates: true })
      );

      // email_suppressions는 프로필 + 주문 이메일을 모두 담은 배열로 upsert
      expect(emailUpsertChain.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            email_hash: hashEmail('test@example.com'),
            channel: 'customer',
            reason: 'unsubscribe',
          }),
          expect.objectContaining({ email_hash: hashEmail('order@example.com') }),
        ]),
        expect.anything()
      );
    });

    it('전화번호 없는 프로필 → sms_suppressions upsert 미호출', async () => {
      setupServer({ email: 'nophone@example.com', phone: null });
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'orders') return makeChain({ data: [], error: null });
        return makeChain({ error: null });
      });

      const result = await updateMarketingConsent(false);
      expect(result.error).toBeUndefined();

      const adminFromCalls = (mockAdminFrom as jest.Mock).mock.calls.map((c: string[]) => c[0]);
      expect(adminFromCalls).not.toContain('sms_suppressions');
    });
  });

  describe('동의 등록(consent=true)', () => {
    it('본인이 mypage에서 건 customer/unsubscribe suppression을 해제(delete) — M1 재동의 복구', async () => {
      setupServer({ email: 'reopt@example.com', phone: '01099998888' });

      const emailChain = makeChain({ error: null });
      const smsChain = makeChain({ error: null });
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'orders') return makeChain({ data: [], error: null });
        if (table === 'email_suppressions') return emailChain;
        if (table === 'sms_suppressions') return smsChain;
        return makeChain({ error: null });
      });

      const result = await updateMarketingConsent(true);
      expect(result.error).toBeUndefined();

      // 재동의 시에는 upsert가 아니라 delete가 호출돼야 한다.
      expect(emailChain.delete).toHaveBeenCalled();
      expect(emailChain.upsert).not.toHaveBeenCalled();
      expect(smsChain.delete).toHaveBeenCalled();
      // customer/unsubscribe로 스코프해 bounce/complaint(channel='all')는 건드리지 않음
      expect(emailChain.eq).toHaveBeenCalledWith('channel', 'customer');
      expect(emailChain.eq).toHaveBeenCalledWith('reason', 'unsubscribe');
    });
  });
});
