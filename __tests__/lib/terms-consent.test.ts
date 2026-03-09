import {
  ARTIST_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';
import { resolveArtistReconsentRequirements } from '@/lib/auth/terms-consent';

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
    });
  });

  it('returns false when contract and tos are up-to-date', () => {
    expect(resolveArtistReconsentRequirements(baseArtistApplication())).toEqual({
      needsArtistConsent: false,
      needsTosConsent: false,
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
    });
  });

  it('does not require re-consent for privacy-only mismatch', () => {
    const application = {
      ...baseArtistApplication(),
      privacy_version: 'privacy-v1-2025-01-01',
    };

    expect(resolveArtistReconsentRequirements(application)).toEqual({
      needsArtistConsent: false,
      needsTosConsent: false,
    });
  });
});
