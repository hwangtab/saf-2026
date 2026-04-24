'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  ARTIST_APPLICATION_CONSENT_SELECT,
  EXHIBITOR_APPLICATION_CONSENT_SELECT,
  hasArtistApplication,
  hasExhibitorApplication,
  needsExhibitorTermsConsent,
  needsPrivacyConsent,
  needsTosConsent,
  resolveArtistReconsentRequirements,
  resolvePostLoginPath,
  sanitizeInternalPath,
  type ArtistApplicationTermsRecord,
  type ExhibitorApplicationTermsRecord,
} from '@/lib/auth/terms-consent';
import { getRequestMetadata } from './request-metadata';
import { getActionErrorMessage } from '@/lib/utils/action-error';

export type TermsConsentState = {
  message: string;
  error?: boolean;
};

type ConsentStatus = {
  profileRole: 'admin' | 'artist' | 'user' | 'exhibitor' | null;
  profileStatus: 'pending' | 'active' | 'suspended' | null;
  artistApplication: ArtistApplicationTermsRecord | null;
  exhibitorApplication: ExhibitorApplicationTermsRecord | null;
};

type Outcome = { kind: 'redirect'; path: string } | { kind: 'state'; state: TermsConsentState };

async function loadConsentStatus(userId: string): Promise<ConsentStatus> {
  const supabase = await createSupabaseServerClient();
  const [profileResult, artistResult, exhibitorResult] = await Promise.all([
    supabase.from('profiles').select('role, status').eq('id', userId).maybeSingle(),
    supabase
      .from('artist_applications')
      .select(ARTIST_APPLICATION_CONSENT_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('exhibitor_applications')
      .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다.');
  }

  if (artistResult.error || exhibitorResult.error) {
    throw new Error('신청 정보를 확인하는 중 오류가 발생했습니다.');
  }

  const profile = profileResult.data;
  return {
    profileRole: (profile?.role as ConsentStatus['profileRole']) || null,
    profileStatus: (profile?.status as ConsentStatus['profileStatus']) || null,
    artistApplication: artistResult.data,
    exhibitorApplication: exhibitorResult.data,
  };
}

// try 내부에서는 redirect()를 호출하지 않고 결과를 값으로 반환한다.
// - redirect()는 NEXT_REDIRECT를 throw하므로 try-catch에 잡히면 리다이렉트가 증발한다.
// - 아래 wrapper가 Outcome을 받아서 try-catch 바깥에서 redirect(path)를 호출한다.
async function computeTermsConsentOutcome(formData: FormData): Promise<Outcome> {
  const user = await requireAuth();
  const nextPath = sanitizeInternalPath(
    (formData.get('next_path') as string | null) || null,
    '/onboarding'
  );
  const status = await loadConsentStatus(user.id);

  if (status.profileRole === 'admin') {
    return { kind: 'redirect', path: '/admin/dashboard' };
  }

  const hasArtist = hasArtistApplication(status.artistApplication);
  const hasExhibitor = hasExhibitorApplication(status.exhibitorApplication);
  const isArtistRole = status.profileRole === 'artist';
  const isExhibitorRole = status.profileRole === 'exhibitor';
  const showArtist = isArtistRole || (!isExhibitorRole && hasArtist);
  const showExhibitor = isExhibitorRole || (!isArtistRole && hasExhibitor);

  const artistReconsent = resolveArtistReconsentRequirements(status.artistApplication);
  const needsArtistConsent = showArtist ? artistReconsent.needsArtistConsent : false;
  const needsExhibitorConsent = showExhibitor
    ? needsExhibitorTermsConsent(status.exhibitorApplication)
    : false;
  const needsArtistPrivacy = showArtist ? artistReconsent.needsPrivacyConsent : false;
  const needsArtistTos = showArtist ? artistReconsent.needsTosConsent : false;
  const needsExhibitorPrivacy = showExhibitor
    ? needsPrivacyConsent(status.exhibitorApplication)
    : false;
  const needsExhibitorTos = showExhibitor ? needsTosConsent(status.exhibitorApplication) : false;
  const needsPrivacy = needsArtistPrivacy || needsExhibitorPrivacy;
  const needsTos = needsArtistTos || needsExhibitorTos;

  if (!needsArtistConsent && !needsExhibitorConsent && !needsPrivacy && !needsTos) {
    return {
      kind: 'redirect',
      path: resolvePostLoginPath({
        role: status.profileRole,
        status: status.profileStatus,
        hasArtistApplication: hasArtist,
        hasExhibitorApplication: hasExhibitor,
      }),
    };
  }

  const artistAgreed = formData.get('agree_artist') === 'on';
  const exhibitorAgreed = formData.get('agree_exhibitor') === 'on';
  const privacyAgreed = formData.get('agree_privacy') === 'on';
  const tosAgreed = formData.get('agree_tos') === 'on';
  const artistTermsReadComplete = formData.get('artist_terms_read_complete') === '1';
  const exhibitorTermsReadComplete = formData.get('exhibitor_terms_read_complete') === '1';
  const artistTermsVersion = (formData.get('artist_terms_version') as string | null)?.trim() || '';
  const exhibitorTermsVersion =
    (formData.get('exhibitor_terms_version') as string | null)?.trim() || '';
  const privacyVersion = (formData.get('privacy_version') as string | null)?.trim() || '';
  const tosVersion = (formData.get('tos_version') as string | null)?.trim() || '';

  if (needsArtistConsent && !artistAgreed) {
    return {
      kind: 'state',
      state: { message: '전시·판매위탁 계약서 동의가 필요합니다.', error: true },
    };
  }

  if (needsArtistConsent && !artistTermsReadComplete) {
    return {
      kind: 'state',
      state: { message: '전시·판매위탁 계약서 전문을 끝까지 확인해주세요.', error: true },
    };
  }

  if (needsArtistConsent && artistTermsVersion !== ARTIST_APPLICATION_TERMS_VERSION) {
    return {
      kind: 'state',
      state: {
        message: '최신 전시·판매위탁 계약서 확인 후 다시 동의해주세요.',
        error: true,
      },
    };
  }

  if (needsExhibitorConsent && !exhibitorAgreed) {
    return {
      kind: 'state',
      state: { message: '출품자 전시위탁 계약서 동의가 필요합니다.', error: true },
    };
  }

  if (needsExhibitorConsent && !exhibitorTermsReadComplete) {
    return {
      kind: 'state',
      state: { message: '출품자 전시위탁 계약서 전문을 끝까지 확인해주세요.', error: true },
    };
  }

  if (needsExhibitorConsent && exhibitorTermsVersion !== EXHIBITOR_APPLICATION_TERMS_VERSION) {
    return {
      kind: 'state',
      state: {
        message: '최신 출품자 전시위탁 계약서 확인 후 다시 동의해주세요.',
        error: true,
      },
    };
  }

  if (needsPrivacy && !privacyAgreed) {
    return {
      kind: 'state',
      state: { message: '개인정보처리방침 동의가 필요합니다.', error: true },
    };
  }

  if (needsPrivacy && privacyVersion !== PRIVACY_POLICY_VERSION) {
    return {
      kind: 'state',
      state: {
        message: '최신 개인정보처리방침 확인 후 다시 동의해주세요.',
        error: true,
      },
    };
  }

  if (needsTos && !tosAgreed) {
    return { kind: 'state', state: { message: '이용약관 동의가 필요합니다.', error: true } };
  }

  if (needsTos && tosVersion !== TERMS_OF_SERVICE_VERSION) {
    return {
      kind: 'state',
      state: {
        message: '최신 이용약관 확인 후 다시 동의해주세요.',
        error: true,
      },
    };
  }

  const requestMetadata = await getRequestMetadata();
  const acceptedAt = new Date().toISOString();
  const supabase = await createSupabaseServerClient();

  // `.update().select('user_id')`로 영향받은 행을 반환받는다.
  // RLS 조건(profiles.status IN 'pending','active')을 충족하지 못하면 Supabase는 error=null, data=[]를 반환.
  // 0행 업데이트를 감지하지 못하면 redirect → 가드가 재동의 요구 → /terms-consent 복귀의 루프로 사용자가 멈춘 것처럼 느낀다.
  const updates: Promise<{ target: string; error: unknown; affectedRows: number }>[] = [];

  if (
    hasArtistApplication(status.artistApplication) &&
    (needsArtistConsent || needsArtistPrivacy || needsArtistTos)
  ) {
    updates.push(
      (async () => {
        const updateData: Record<string, string | null> = { updated_at: acceptedAt };
        if (needsArtistConsent) {
          updateData.terms_version = ARTIST_APPLICATION_TERMS_VERSION;
          updateData.terms_accepted_at = acceptedAt;
          updateData.terms_accepted_ip = requestMetadata.ip;
          updateData.terms_accepted_user_agent = requestMetadata.userAgent;
        }
        if (needsArtistPrivacy) {
          updateData.privacy_version = PRIVACY_POLICY_VERSION;
          updateData.privacy_accepted_at = acceptedAt;
        }
        if (needsArtistTos) {
          updateData.tos_version = TERMS_OF_SERVICE_VERSION;
          updateData.tos_accepted_at = acceptedAt;
        }
        const { data, error } = await supabase
          .from('artist_applications')
          .update(updateData)
          .eq('user_id', user.id)
          .select('user_id');
        return { target: '아티스트', error, affectedRows: data?.length ?? 0 };
      })()
    );
  }

  if (
    hasExhibitorApplication(status.exhibitorApplication) &&
    (needsExhibitorConsent || needsExhibitorPrivacy || needsExhibitorTos)
  ) {
    updates.push(
      (async () => {
        const updateData: Record<string, string | null> = { updated_at: acceptedAt };
        if (needsExhibitorConsent) {
          updateData.terms_version = EXHIBITOR_APPLICATION_TERMS_VERSION;
          updateData.terms_accepted_at = acceptedAt;
          updateData.terms_accepted_ip = requestMetadata.ip;
          updateData.terms_accepted_user_agent = requestMetadata.userAgent;
        }
        if (needsExhibitorPrivacy) {
          updateData.privacy_version = PRIVACY_POLICY_VERSION;
          updateData.privacy_accepted_at = acceptedAt;
        }
        if (needsExhibitorTos) {
          updateData.tos_version = TERMS_OF_SERVICE_VERSION;
          updateData.tos_accepted_at = acceptedAt;
        }
        const { data, error } = await supabase
          .from('exhibitor_applications')
          .update(updateData)
          .eq('user_id', user.id)
          .select('user_id');
        return { target: '출품자', error, affectedRows: data?.length ?? 0 };
      })()
    );
  }

  // 재동의 필요 플래그는 true인데 실제로 UPDATE 큐에 들어간 게 0건이라면 — 예: exhibitor_application
  // row가 존재해 needsPrivacyConsent는 true로 평가되었지만 representative_name 등이 비어
  // hasExhibitorApplication() 가드가 false를 반환한 경우 — 저장 없이 redirect되면 가드가 다시 재동의를
  // 요구해 사용자에게는 "스피너가 멎지 않는" 무한 루프로 보인다. 명시적 에러로 차단.
  if (
    updates.length === 0 &&
    (needsArtistConsent || needsExhibitorConsent || needsPrivacy || needsTos)
  ) {
    console.warn(
      `[terms-consent] no-op submit: user=${user.id} role=${status.profileRole} status=${status.profileStatus} needs={artist:${needsArtistConsent},exh:${needsExhibitorConsent},priv:${needsPrivacy},tos:${needsTos}} hasArtistApp=${hasArtist} hasExhApp=${hasExhibitor}`
    );
    return {
      kind: 'state',
      state: {
        message:
          '동의를 저장할 신청 정보를 찾지 못했습니다. 신청서 정보가 누락된 것 같습니다. 관리자에게 문의해주세요.',
        error: true,
      },
    };
  }

  const results = await Promise.all(updates);
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    const targets = failed.map((f) => f.target).join(', ');
    return {
      kind: 'state',
      state: { message: `${targets} 계약서 동의 저장 중 오류가 발생했습니다.`, error: true },
    };
  }

  const silentlySkipped = results.filter((r) => !r.error && r.affectedRows === 0);
  if (silentlySkipped.length > 0) {
    const targets = silentlySkipped.map((r) => r.target).join(', ');
    console.warn(
      `[terms-consent] silent update skip: user=${user.id} targets=${targets} role=${status.profileRole} status=${status.profileStatus}`
    );
    return {
      kind: 'state',
      state: {
        message: `${targets} 계약서 동의를 저장하지 못했습니다. 계정 상태를 확인 후 다시 시도해주세요.`,
        error: true,
      },
    };
  }

  return { kind: 'redirect', path: nextPath };
}

// 처리되지 않은 throw는 `useActionState`의 pending 상태를 해제하지 못해 버튼 스피너가 계속 돌아간다.
// 이를 막기 위해 모든 로직을 try-catch로 감싸고, 프레임워크 예외(NEXT_REDIRECT 등)만 `unstable_rethrow`로 재전파한다.
// 일반 예외는 사용자에게 보여줄 에러 state로 변환해 pending이 풀리도록 한다.
export async function submitTermsConsent(
  _prevState: TermsConsentState,
  formData: FormData
): Promise<TermsConsentState> {
  let outcome: Outcome;
  try {
    outcome = await computeTermsConsentOutcome(formData);
  } catch (error) {
    unstable_rethrow(error);
    console.error('[terms-consent] unexpected error', error);
    return {
      message: getActionErrorMessage(error, '동의 처리 중 오류가 발생했습니다.'),
      error: true,
    };
  }

  if (outcome.kind === 'redirect') {
    redirect(outcome.path);
  }
  return outcome.state;
}
