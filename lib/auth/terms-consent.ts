import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
} from '@/lib/constants';
import type { UserRole, UserStatus } from '@/types/database.types';

type NullableText = string | null | undefined;

export type ArtistApplicationTermsRecord = {
  artist_name?: NullableText;
  contact?: NullableText;
  bio?: NullableText;
  terms_version?: NullableText;
  terms_accepted_at?: NullableText;
};

export type ExhibitorApplicationTermsRecord = {
  representative_name?: NullableText;
  contact?: NullableText;
  bio?: NullableText;
  terms_version?: NullableText;
  terms_accepted_at?: NullableText;
};

export function sanitizeInternalPath(nextPath: string | null | undefined, fallback = '/'): string {
  if (!nextPath) return fallback;
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.startsWith('/terms-consent')) return fallback;
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

export function buildTermsConsentPath(input: {
  nextPath: string;
  needsArtistConsent?: boolean;
  needsExhibitorConsent?: boolean;
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
