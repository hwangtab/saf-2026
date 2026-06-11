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

// ── 헬퍼: supabase query builder chain mock ─────────────────────────────
function makeUpdateChain(error: null | { message: string } = null) {
  const chain: Record<string, jest.Mock> = {};
  chain.update = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.single = jest.fn(async () => ({ data: null, error }));
  // awaited directly → resolve { error }
  (chain as unknown as Promise<{ error: typeof error }>).then = (
    resolve: (v: { error: typeof error }) => void
  ) => {
    resolve({ error });
    return Promise.resolve({ error });
  };
  return chain;
}

function makeSelectSingleChain(
  data: Record<string, unknown> | null,
  error: null | { message: string } = null
) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.single = jest.fn(async () => ({ data, error }));
  return chain;
}

function makeUpsertChain(error: null | { message: string } = null) {
  const chain: Record<string, jest.Mock> = {};
  chain.upsert = jest.fn(async () => ({ error }));
  return chain;
}

describe('updateMarketingConsent', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('동의 해제(consent=false)', () => {
    it('010 번호가 있는 프로필 → sms_suppressions upsert 호출', async () => {
      const profile = { email: 'test@example.com', phone: '01012345678' };

      // server client: profiles.update → ok, profiles.select → profile 반환
      let serverCallCount = 0;
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          serverCallCount += 1;
          if (serverCallCount === 1) {
            // 첫 번째 호출: update marketing_consent
            return makeUpdateChain();
          }
          // 두 번째 호출: select phone/email
          return makeSelectSingleChain(profile);
        }
        return makeUpdateChain();
      });

      // admin client: email_suppressions upsert + sms_suppressions upsert
      const emailUpsertChain = makeUpsertChain();
      const smsUpsertChain = makeUpsertChain();
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'email_suppressions') return emailUpsertChain;
        if (table === 'sms_suppressions') return smsUpsertChain;
        return makeUpsertChain();
      });

      const result = await updateMarketingConsent(false);

      expect(result.error).toBeUndefined();

      // sms_suppressions upsert가 정확한 shape으로 호출됐는지 검증
      expect(mockAdminFrom).toHaveBeenCalledWith('sms_suppressions');
      expect(smsUpsertChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_hash: hashPhone('01012345678'),
          channel: 'customer',
          reason: 'unsubscribe',
        }),
        expect.objectContaining({ onConflict: 'phone_hash,channel', ignoreDuplicates: true })
      );

      // email_suppressions upsert도 호출됐는지
      expect(mockAdminFrom).toHaveBeenCalledWith('email_suppressions');
      expect(emailUpsertChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email_hash: hashEmail('test@example.com'),
          channel: 'customer',
          reason: 'unsubscribe',
        }),
        expect.anything()
      );
    });

    it('전화번호 없는 프로필 → sms_suppressions upsert 미호출', async () => {
      const profile = { email: 'nophone@example.com', phone: null };

      let serverCallCount = 0;
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          serverCallCount += 1;
          if (serverCallCount === 1) return makeUpdateChain();
          return makeSelectSingleChain(profile);
        }
        return makeUpdateChain();
      });

      const emailUpsertChain = makeUpsertChain();
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'email_suppressions') return emailUpsertChain;
        return makeUpsertChain();
      });

      const result = await updateMarketingConsent(false);

      expect(result.error).toBeUndefined();
      // sms_suppressions는 건드리지 않아야 함
      const adminFromCalls = (mockAdminFrom as jest.Mock).mock.calls.map((c: string[]) => c[0]);
      expect(adminFromCalls).not.toContain('sms_suppressions');
    });
  });

  describe('동의 등록(consent=true)', () => {
    it('수신거부 테이블 일절 건드리지 않음', async () => {
      mockServerFrom.mockImplementation(() => makeUpdateChain());

      const result = await updateMarketingConsent(true);

      expect(result.error).toBeUndefined();
      expect(mockAdminFrom).not.toHaveBeenCalled();
    });
  });
});
