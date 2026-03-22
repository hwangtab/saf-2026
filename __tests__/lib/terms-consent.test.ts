import {
  ARTIST_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';
import { resolveArtistReconsentRequirements, sanitizeInternalPath } from '@/lib/auth/terms-consent';

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

describe('resolveArtistReconsentRequirements', () => {
  it('returns false when artist application is missing', () => {
    expect(resolveArtistReconsentRequirements(null)).toEqual({
      needsArtistConsent: false,
      needsTosConsent: false,
      needsPrivacyConsent: false,
    });
  });

  it('returns false when contract, tos, and privacy are up-to-date', () => {
    expect(resolveArtistReconsentRequirements(baseArtistApplication())).toEqual({
      needsArtistConsent: false,
      needsTosConsent: false,
      needsPrivacyConsent: false,
    });
  });

  it('requires both contract and tos when contract is outdated', () => {
    const application = {
      ...baseArtistApplication(),
      terms_version: 'artist-contract-v2-2025-01-01',
    };

    expect(resolveArtistReconsentRequirements(application)).toEqual({
      needsArtistConsent: true,
      needsTosConsent: true,
      needsPrivacyConsent: false,
    });
  });

  it('requires both contract and tos when tos is outdated', () => {
    const application = {
      ...baseArtistApplication(),
      tos_version: 'terms-v0-2025-01-01',
    };

    expect(resolveArtistReconsentRequirements(application)).toEqual({
      needsArtistConsent: true,
      needsTosConsent: true,
      needsPrivacyConsent: false,
    });
  });

  it('requires privacy consent when privacy version is outdated', () => {
    const application = {
      ...baseArtistApplication(),
      privacy_version: 'privacy-v1-2025-01-01',
    };

    expect(resolveArtistReconsentRequirements(application)).toEqual({
      needsArtistConsent: false,
      needsTosConsent: false,
      needsPrivacyConsent: true,
    });
  });

  it('requires all consents when all versions are outdated', () => {
    const application = {
      ...baseArtistApplication(),
      terms_version: 'artist-contract-v2-2025-01-01',
      tos_version: 'terms-v0-2025-01-01',
      privacy_version: 'privacy-v1-2025-01-01',
    };

    expect(resolveArtistReconsentRequirements(application)).toEqual({
      needsArtistConsent: true,
      needsTosConsent: true,
      needsPrivacyConsent: true,
    });
  });
});

describe('sanitizeInternalPath', () => {
  it('returns the path for a valid internal path', () => {
    expect(sanitizeInternalPath('/dashboard/artworks')).toBe('/dashboard/artworks');
  });

  it('returns fallback for null or undefined', () => {
    expect(sanitizeInternalPath(null)).toBe('/');
    expect(sanitizeInternalPath(undefined)).toBe('/');
  });

  it('returns fallback for non-slash-prefixed paths', () => {
    expect(sanitizeInternalPath('dashboard')).toBe('/');
    expect(sanitizeInternalPath('https://evil.com')).toBe('/');
  });

  it('returns fallback for double-slash paths', () => {
    expect(sanitizeInternalPath('//evil.com')).toBe('/');
  });

  it('returns fallback for paths with query strings', () => {
    expect(sanitizeInternalPath('/dashboard?injected=param')).toBe('/');
  });

  it('returns fallback for paths with fragments', () => {
    expect(sanitizeInternalPath('/dashboard#fragment')).toBe('/');
  });

  it('returns fallback for paths with backslash', () => {
    expect(sanitizeInternalPath('/dashboard\\evil')).toBe('/');
  });

  it('returns fallback for paths starting with /terms-consent', () => {
    expect(sanitizeInternalPath('/terms-consent')).toBe('/');
    expect(sanitizeInternalPath('/terms-consent?next=/evil')).toBe('/');
  });

  it('returns custom fallback when provided', () => {
    expect(sanitizeInternalPath(null, '/home')).toBe('/home');
  });

  it('trims whitespace', () => {
    expect(sanitizeInternalPath('  /dashboard  ')).toBe('/dashboard');
  });
});
