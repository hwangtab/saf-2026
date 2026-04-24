/**
 * submitTermsConsent Server Action 단위 테스트
 *
 * 본 액션은 다음 책임을 가진다:
 *  1. 폼 입력 검증 (체크박스, 버전, 스크롤 완료)
 *  2. Supabase RLS-aware UPDATE 후 영향받은 행 수 확인
 *  3. NEXT_REDIRECT는 try-catch 바깥에서만 throw되도록 보장 (`unstable_rethrow` + outcome value 패턴)
 *  4. silent RLS 실패(`error=null, rows=0`)를 사용자에게 명시적 에러로 노출
 *
 * 본 테스트는 위 4가지를 모두 검증해, 무한 스피너 회귀를 잠근다.
 */

import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';

// --- Mocks --------------------------------------------------------------

const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({ get: mockHeadersGet })),
}));

// next/navigation: redirect는 NEXT_REDIRECT를 throw해 디그스트로 식별. unstable_rethrow는 그 형태 그대로 재throw.
class MockRedirectError extends Error {
  digest: string;
  constructor(path: string) {
    super('NEXT_REDIRECT');
    this.digest = `NEXT_REDIRECT;replace;${path};307;`;
  }
}
jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new MockRedirectError(path);
  }),
  unstable_rethrow: jest.fn((error: unknown) => {
    if (error instanceof Error && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT;')) {
        throw error;
      }
    }
  }),
}));

// requireAuth: 단순히 user 객체 반환
const mockRequireAuth = jest.fn(async () => ({ id: 'user-1', email: 't@t' }));
jest.mock('@/lib/auth/guards', () => ({
  requireAuth: () => mockRequireAuth(),
}));

// request-metadata
jest.mock('@/app/actions/request-metadata', () => ({
  getRequestMetadata: jest.fn(async () => ({ ip: '1.2.3.4', userAgent: 'jest' })),
}));

// Supabase: profiles / artist_applications / exhibitor_applications 분기
type MockResult = { data: unknown; error: unknown };

let mockProfileResult: MockResult = { data: null, error: null };
let mockArtistAppResult: MockResult = { data: null, error: null };
let mockExhibitorAppResult: MockResult = { data: null, error: null };
let mockArtistUpdateResult: MockResult = { data: null, error: null };
let mockExhibitorUpdateResult: MockResult = { data: null, error: null };

const mockArtistUpdate = jest.fn();
const mockExhibitorUpdate = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(async () => ({
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => mockProfileResult) })),
          })),
        };
      }
      if (table === 'artist_applications') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => mockArtistAppResult) })),
          })),
          update: jest.fn((payload: Record<string, unknown>) => {
            mockArtistUpdate(payload);
            return {
              eq: jest.fn(() => ({
                select: jest.fn(async () => mockArtistUpdateResult),
              })),
            };
          }),
        };
      }
      if (table === 'exhibitor_applications') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => mockExhibitorAppResult) })),
          })),
          update: jest.fn((payload: Record<string, unknown>) => {
            mockExhibitorUpdate(payload);
            return {
              eq: jest.fn(() => ({
                select: jest.fn(async () => mockExhibitorUpdateResult),
              })),
            };
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  })),
}));

// --- Helpers ------------------------------------------------------------

const acceptedAt = '2026-03-09T00:00:00.000Z';

function baseArtistApplication() {
  return {
    artist_name: '테스트 작가',
    contact: '010-0000-0000',
    bio: '소개',
    terms_version: ARTIST_APPLICATION_TERMS_VERSION,
    terms_accepted_at: acceptedAt,
    privacy_version: PRIVACY_POLICY_VERSION,
    privacy_accepted_at: acceptedAt,
    tos_version: TERMS_OF_SERVICE_VERSION,
    tos_accepted_at: acceptedAt,
  };
}

function baseExhibitorApplication() {
  return {
    representative_name: '테스트 대표',
    contact: '010-1111-1111',
    bio: '소개',
    terms_version: EXHIBITOR_APPLICATION_TERMS_VERSION,
    terms_accepted_at: acceptedAt,
    privacy_version: PRIVACY_POLICY_VERSION,
    privacy_accepted_at: acceptedAt,
    tos_version: TERMS_OF_SERVICE_VERSION,
    tos_accepted_at: acceptedAt,
  };
}

function buildPrivacyOnlyFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set('next_path', '/dashboard/artworks');
  fd.set('agree_privacy', 'on');
  fd.set('privacy_version', PRIVACY_POLICY_VERSION);
  fd.set('artist_terms_version', ARTIST_APPLICATION_TERMS_VERSION);
  fd.set('exhibitor_terms_version', EXHIBITOR_APPLICATION_TERMS_VERSION);
  fd.set('tos_version', TERMS_OF_SERVICE_VERSION);
  fd.set('artist_terms_read_complete', '0');
  fd.set('exhibitor_terms_read_complete', '0');
  for (const [k, v] of Object.entries(overrides)) {
    fd.set(k, v);
  }
  return fd;
}

function isRedirect(error: unknown, expectedPath?: string): boolean {
  if (!(error instanceof Error)) return false;
  const digest = (error as { digest?: string }).digest;
  if (typeof digest !== 'string' || !digest.startsWith('NEXT_REDIRECT;')) return false;
  if (expectedPath) {
    return digest.includes(`;${expectedPath};`);
  }
  return true;
}

// --- Test setup ---------------------------------------------------------

let submitTermsConsent: typeof import('@/app/actions/terms-consent').submitTermsConsent;

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
  mockProfileResult = { data: null, error: null };
  mockArtistAppResult = { data: null, error: null };
  mockExhibitorAppResult = { data: null, error: null };
  mockArtistUpdateResult = { data: null, error: null };
  mockExhibitorUpdateResult = { data: null, error: null };
  mockHeadersGet.mockReturnValue('1.2.3.4');
  mockRequireAuth.mockResolvedValue({ id: 'user-1', email: 't@t' });

  // 콘솔 노이즈 차단 (silent skip 경고와 unexpected error 로그)
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  const mod = await import('@/app/actions/terms-consent');
  submitTermsConsent = mod.submitTermsConsent;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// --- Tests --------------------------------------------------------------

describe('submitTermsConsent — 아티스트 privacy-only 재동의', () => {
  beforeEach(() => {
    mockProfileResult = { data: { role: 'artist', status: 'active' }, error: null };
    mockArtistAppResult = {
      data: {
        ...baseArtistApplication(),
        privacy_version: 'privacy-v1-old',
        privacy_accepted_at: '2025-01-01',
      },
      error: null,
    };
  });

  it('UPDATE 1행 성공 시 nextPath로 redirect (NEXT_REDIRECT throw)', async () => {
    mockArtistUpdateResult = { data: [{ user_id: 'user-1' }], error: null };

    let caught: unknown;
    try {
      await submitTermsConsent({ message: '' }, buildPrivacyOnlyFormData());
    } catch (e) {
      caught = e;
    }

    expect(isRedirect(caught, '/dashboard/artworks')).toBe(true);
    expect(mockArtistUpdate).toHaveBeenCalledTimes(1);
    const payload = mockArtistUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.privacy_version).toBe(PRIVACY_POLICY_VERSION);
    expect(payload.privacy_accepted_at).toBeTruthy();
    // 계약·ToS는 손대지 않음
    expect(payload.terms_version).toBeUndefined();
    expect(payload.tos_version).toBeUndefined();
  });

  it('silent RLS 실패(0행 업데이트) → error state 반환, redirect 호출 안 함', async () => {
    mockArtistUpdateResult = { data: [], error: null };

    const result = await submitTermsConsent({ message: '' }, buildPrivacyOnlyFormData());

    expect(result.error).toBe(true);
    expect(result.message).toMatch(/계정 상태/);
    expect(mockArtistUpdate).toHaveBeenCalledTimes(1);
    // console.warn으로 진단 로그 남기는지
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[terms-consent] silent update skip')
    );
  });

  it('Supabase가 error 반환 → error state, "오류" 메시지', async () => {
    mockArtistUpdateResult = { data: null, error: { message: 'connection refused' } };

    const result = await submitTermsConsent({ message: '' }, buildPrivacyOnlyFormData());

    expect(result.error).toBe(true);
    expect(result.message).toMatch(/오류/);
  });

  it('체크박스 미동의 → error state, UPDATE 호출 안 함', async () => {
    const fd = buildPrivacyOnlyFormData();
    fd.delete('agree_privacy');

    const result = await submitTermsConsent({ message: '' }, fd);

    expect(result.error).toBe(true);
    expect(result.message).toMatch(/동의가 필요/);
    expect(mockArtistUpdate).not.toHaveBeenCalled();
  });

  it('privacy_version 불일치(stale form) → error state, UPDATE 호출 안 함', async () => {
    const fd = buildPrivacyOnlyFormData({ privacy_version: 'privacy-v0-stale' });

    const result = await submitTermsConsent({ message: '' }, fd);

    expect(result.error).toBe(true);
    expect(result.message).toMatch(/최신/);
    expect(mockArtistUpdate).not.toHaveBeenCalled();
  });
});

describe('submitTermsConsent — 출품자 privacy-only 재동의', () => {
  it('UPDATE 1행 성공 시 nextPath로 redirect', async () => {
    mockProfileResult = { data: { role: 'exhibitor', status: 'active' }, error: null };
    mockExhibitorAppResult = {
      data: {
        ...baseExhibitorApplication(),
        privacy_version: 'privacy-v1-old',
        privacy_accepted_at: '2025-01-01',
      },
      error: null,
    };
    mockExhibitorUpdateResult = { data: [{ user_id: 'user-1' }], error: null };

    const fd = buildPrivacyOnlyFormData();
    fd.set('next_path', '/exhibitor');

    let caught: unknown;
    try {
      await submitTermsConsent({ message: '' }, fd);
    } catch (e) {
      caught = e;
    }

    expect(isRedirect(caught, '/exhibitor')).toBe(true);
    expect(mockExhibitorUpdate).toHaveBeenCalledTimes(1);
    expect(mockArtistUpdate).not.toHaveBeenCalled();
  });
});

describe('submitTermsConsent — empty-updates 가드 (H1 회귀 방지)', () => {
  it('exhibitor application의 representative_name이 비어 있는데 privacy 재동의가 필요한 경우 → error state, redirect 호출 안 함', async () => {
    // hasExhibitorApplication 가드가 false를 반환하지만 needsPrivacyConsent는 true인 case.
    // 이전 코드는 updates 큐가 비고 redirect를 그냥 호출해 가드가 다시 재동의 요구 → 무한 루프.
    mockProfileResult = { data: { role: 'exhibitor', status: 'active' }, error: null };
    mockExhibitorAppResult = {
      data: {
        // representative_name 누락 → hasExhibitorApplication() = false
        representative_name: '',
        contact: '010-0000-0000',
        bio: '소개',
        terms_version: EXHIBITOR_APPLICATION_TERMS_VERSION,
        terms_accepted_at: acceptedAt,
        privacy_version: 'privacy-v1-old', // 구버전 → needsPrivacyConsent = true
        privacy_accepted_at: '2025-01-01',
        tos_version: TERMS_OF_SERVICE_VERSION,
        tos_accepted_at: acceptedAt,
      },
      error: null,
    };

    const result = await submitTermsConsent({ message: '' }, buildPrivacyOnlyFormData());

    expect(result.error).toBe(true);
    expect(result.message).toMatch(/신청 정보를 찾지 못했|관리자에게 문의/);
    expect(mockExhibitorUpdate).not.toHaveBeenCalled();
    expect(mockArtistUpdate).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[terms-consent] no-op submit')
    );
  });
});

describe('submitTermsConsent — admin 단축 경로', () => {
  it('profile.role=admin이면 모든 폼 검증 우회하고 /admin/dashboard로 redirect', async () => {
    mockProfileResult = { data: { role: 'admin', status: 'active' }, error: null };

    let caught: unknown;
    try {
      await submitTermsConsent({ message: '' }, new FormData());
    } catch (e) {
      caught = e;
    }

    expect(isRedirect(caught, '/admin/dashboard')).toBe(true);
    expect(mockArtistUpdate).not.toHaveBeenCalled();
    expect(mockExhibitorUpdate).not.toHaveBeenCalled();
  });
});

describe('submitTermsConsent — 예외 처리', () => {
  it('내부 throw(예: profiles 조회 실패) → error state로 변환, NEXT_REDIRECT는 통과', async () => {
    mockProfileResult = { data: null, error: { message: 'connection lost' } };
    mockArtistAppResult = { data: baseArtistApplication(), error: null };

    const result = await submitTermsConsent({ message: '' }, buildPrivacyOnlyFormData());

    expect(result.error).toBe(true);
    // NEXT_REDIRECT가 아닌 일반 throw는 catch에서 변환
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('재동의가 모두 충족된 상태로 들어오면 적절한 redirect로 단축 (active artist)', async () => {
    mockProfileResult = { data: { role: 'artist', status: 'active' }, error: null };
    mockArtistAppResult = { data: baseArtistApplication(), error: null };

    let caught: unknown;
    try {
      await submitTermsConsent({ message: '' }, buildPrivacyOnlyFormData());
    } catch (e) {
      caught = e;
    }

    // 재동의 불필요 → resolvePostLoginPath 결과(/dashboard/artworks)로 redirect, UPDATE 호출 안 함
    expect(isRedirect(caught, '/dashboard/artworks')).toBe(true);
    expect(mockArtistUpdate).not.toHaveBeenCalled();
  });
});
