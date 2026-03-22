import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';
import type { UserRole, UserStatus } from '@/types/database.types';

export const ARTIST_APPLICATION_CONSENT_SELECT =
  'artist_name, contact, bio, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at, tos_version, tos_accepted_at' as const;

export const EXHIBITOR_APPLICATION_CONSENT_SELECT =
  'representative_name, contact, bio, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at, tos_version, tos_accepted_at' as const;

type NullableText = string | null | undefined;

export type ArtistApplicationTermsRecord = {
  artist_name?: NullableText;
  contact?: NullableText;
  bio?: NullableText;
  terms_version?: NullableText;
  terms_accepted_at?: NullableText;
  privacy_version?: NullableText;
  privacy_accepted_at?: NullableText;
  tos_version?: NullableText;
  tos_accepted_at?: NullableText;
};

export type ExhibitorApplicationTermsRecord = {
  representative_name?: NullableText;
  contact?: NullableText;
  bio?: NullableText;
  terms_version?: NullableText;
  terms_accepted_at?: NullableText;
  privacy_version?: NullableText;
  privacy_accepted_at?: NullableText;
  tos_version?: NullableText;
  tos_accepted_at?: NullableText;
};

export function sanitizeInternalPath(nextPath: string | null | undefined, fallback = '/'): string {
  if (!nextPath) return fallback;
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.startsWith('/terms-consent')) return fallback;
  // 쿼리 스트링과 프래그먼트 차단 (파라미터 인젝션 방지)
  if (trimmed.includes('?') || trimmed.includes('#')) return fallback;
  // 백슬래시와 제어 문자 차단 (open redirect 방지)
  if (/[\\<>\s]/.test(trimmed.slice(1))) return fallback;
  return trimmed;
}

function isPresent(value: NullableText): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasAcceptedCurrentTerms(
  termsVersion: NullableText,
  termsAcceptedAt: NullableText,
  expectedVersion: string
): boolean {
  return isPresent(termsVersion) && termsVersion === expectedVersion && isPresent(termsAcceptedAt);
}

export function hasArtistApplication(
  application: ArtistApplicationTermsRecord | null | undefined
): boolean {
  if (!application) return false;
  return (
    isPresent(application.artist_name) &&
    isPresent(application.contact) &&
    isPresent(application.bio)
  );
}

export function hasExhibitorApplication(
  application: ExhibitorApplicationTermsRecord | null | undefined
): boolean {
  if (!application) return false;
  return (
    isPresent(application.representative_name) &&
    isPresent(application.contact) &&
    isPresent(application.bio)
  );
}

export function needsArtistTermsConsent(
  application: ArtistApplicationTermsRecord | null | undefined
): boolean {
  if (!hasArtistApplication(application)) return false;
  return !hasAcceptedCurrentTerms(
    application?.terms_version,
    application?.terms_accepted_at,
    ARTIST_APPLICATION_TERMS_VERSION
  );
}

export function needsExhibitorTermsConsent(
  application: ExhibitorApplicationTermsRecord | null | undefined
): boolean {
  if (!hasExhibitorApplication(application)) return false;
  return !hasAcceptedCurrentTerms(
    application?.terms_version,
    application?.terms_accepted_at,
    EXHIBITOR_APPLICATION_TERMS_VERSION
  );
}

export function needsPrivacyConsent(
  application: ArtistApplicationTermsRecord | ExhibitorApplicationTermsRecord | null | undefined
): boolean {
  if (!application) return false;
  return !hasAcceptedCurrentTerms(
    application?.privacy_version,
    application?.privacy_accepted_at,
    PRIVACY_POLICY_VERSION
  );
}

export function needsTosConsent(
  application: ArtistApplicationTermsRecord | ExhibitorApplicationTermsRecord | null | undefined
): boolean {
  if (!application) return false;
  return !hasAcceptedCurrentTerms(
    application?.tos_version,
    application?.tos_accepted_at,
    TERMS_OF_SERVICE_VERSION
  );
}

export function resolveArtistReconsentRequirements(
  application: ArtistApplicationTermsRecord | null | undefined
): {
  needsArtistConsent: boolean;
  needsTosConsent: boolean;
  needsPrivacyConsent: boolean;
} {
  if (!hasArtistApplication(application)) {
    return {
      needsArtistConsent: false,
      needsTosConsent: false,
      needsPrivacyConsent: false,
    };
  }

  const needsContract = needsArtistTermsConsent(application);
  const needsTos = needsTosConsent(application);
  const needsBundle = needsContract || needsTos;
  const needsPrivacy = needsPrivacyConsent(application);

  return {
    needsArtistConsent: needsBundle,
    needsTosConsent: needsBundle,
    needsPrivacyConsent: needsPrivacy,
  };
}

export function hasAllRequiredConsents(
  application: ArtistApplicationTermsRecord | ExhibitorApplicationTermsRecord | null | undefined,
  role: 'artist' | 'exhibitor'
): boolean {
  if (!application) return false;
  const termsOk =
    role === 'artist'
      ? !needsArtistTermsConsent(application as ArtistApplicationTermsRecord)
      : !needsExhibitorTermsConsent(application as ExhibitorApplicationTermsRecord);
  return termsOk && !needsPrivacyConsent(application) && !needsTosConsent(application);
}

export function buildTermsConsentPath(input: {
  nextPath: string;
  needsArtistConsent?: boolean;
  needsExhibitorConsent?: boolean;
  needsPrivacyConsent?: boolean;
  needsTosConsent?: boolean;
}): string {
  const params = new URLSearchParams({
    next: sanitizeInternalPath(input.nextPath, '/'),
  });

  if (input.needsArtistConsent) {
    params.set('artist', '1');
  }

  if (input.needsExhibitorConsent) {
    params.set('exhibitor', '1');
  }

  if (input.needsPrivacyConsent) {
    params.set('privacy', '1');
  }

  if (input.needsTosConsent) {
    params.set('tos', '1');
  }

  return `/terms-consent?${params.toString()}`;
}

export function resolvePostLoginPath(input: {
  role: UserRole | null | undefined;
  status: UserStatus | null | undefined;
  hasArtistApplication: boolean;
  hasExhibitorApplication: boolean;
}): string {
  if (input.role === 'admin') {
    return '/admin/dashboard';
  }

  if (input.role === 'exhibitor') {
    if (input.status === 'active') {
      return input.hasExhibitorApplication ? '/exhibitor' : '/exhibitor/onboarding?recover=1';
    }

    if (input.status === 'suspended') {
      return '/exhibitor/suspended';
    }

    return input.hasExhibitorApplication ? '/exhibitor/pending' : '/exhibitor/onboarding';
  }

  if (input.role === 'artist') {
    if (input.status === 'active') {
      return input.hasArtistApplication ? '/dashboard/artworks' : '/onboarding?recover=1';
    }
    if (input.status === 'suspended') return '/dashboard/suspended';
    return input.hasArtistApplication ? '/dashboard/pending' : '/onboarding';
  }

  if (input.hasExhibitorApplication) {
    return '/exhibitor/pending';
  }

  if (input.hasArtistApplication) {
    return '/dashboard/pending';
  }

  return '/onboarding';
}
