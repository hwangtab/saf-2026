/** @jest-environment node */
import { updateMyProfile } from '@/app/actions/mypage';

const profileUpdate = jest.fn(() => ({ eq: jest.fn(async () => ({ error: null })) }));
jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      updateUser: async () => ({ error: null }),
    },
    from: () => ({ update: profileUpdate }),
  })),
  createSupabaseAdminClient: jest.fn(),
}));

describe('updateMyProfile phone', () => {
  beforeEach(() => jest.clearAllMocks());

  it('정상 010 번호를 정규화해 저장', async () => {
    const r = await updateMyProfile('홍길동', '010-1234-5678');
    expect(r.error).toBeUndefined();
    expect(profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '홍길동', phone: '01012345678' })
    );
  });

  it('비-010 번호는 거부', async () => {
    const r = await updateMyProfile('홍길동', '02-123-4567');
    expect(r.error).toBe('invalid_phone');
  });

  it('phone 미지정 시 name만 갱신(phone 키 없음)', async () => {
    await updateMyProfile('홍길동');
    const arg = profileUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).not.toHaveProperty('phone');
  });
});
