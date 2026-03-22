/**
 * Auth guard unit tests
 *
 * Tests the routing logic of requireAdmin, requireArtistActive, requireExhibitor
 * by mocking Supabase responses and verifying redirect behavior.
 */

import type { UserRole, UserStatus } from '@/types/database.types';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';

// Track redirect calls
const mockRedirect = jest.fn();

// Mock next/navigation redirect
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error(`REDIRECT:${args[0]}`);
  },
}));

// Mock react cache as passthrough
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: Function) => fn,
}));

// Mock Supabase responses
let mockAuthUser: { id: string; email: string } | null = null;
let mockAuthError: Error | null = null;
let mockProfile: { role: UserRole; status: UserStatus } | null = null;
let mockProfileError: Error | null = null;
let mockApplication: Record<string, unknown> | null = null;

jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(() => {
    let callCount = 0;
    return {
      auth: {
        getUser: jest.fn(() => ({
          data: { user: mockAuthUser },
          error: mockAuthError,
        })),
      },
      from: jest.fn((table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => {
              if (table === 'profiles') {
                return { data: mockProfile, error: mockProfileError };
              }
              // artist_applications or exhibitor_applications
              return { data: mockApplication, error: null };
            }),
          })),
        })),
      })),
    };
  }),
}));

// Import after mocks
let requireAdmin: typeof import('@/lib/auth/guards').requireAdmin;
let requireArtistActive: typeof import('@/lib/auth/guards').requireArtistActive;
let requireExhibitor: typeof import('@/lib/auth/guards').requireExhibitor;

beforeEach(() => {
  jest.resetModules();
  mockRedirect.mockClear();
  mockAuthUser = null;
  mockAuthError = null;
  mockProfile = null;
  mockProfileError = null;
  mockApplication = null;
});

async function loadGuards() {
  const guards = await import('@/lib/auth/guards');
  requireAdmin = guards.requireAdmin;
  requireArtistActive = guards.requireArtistActive;
  requireExhibitor = guards.requireExhibitor;
}

function setAuth(id = 'user-1', email = 'test@test.com') {
  mockAuthUser = { id, email };
  mockAuthError = null;
}

function setProfile(role: UserRole, status: UserStatus) {
  mockProfile = { role, status };
}

function setApplication(data: Record<string, unknown>) {
  mockApplication = data;
}

// ---------- requireAdmin ----------

describe('requireAdmin', () => {
  beforeEach(async () => {
    await loadGuards();
  });

  it('redirects to /login when not authenticated', async () => {
    mockAuthError = new Error('not authenticated');
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects to / when user has no profile', async () => {
    setAuth();
    mockProfile = null;
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
  });

  it('redirects to / when user is artist, not admin', async () => {
    setAuth();
    setProfile('artist', 'active');
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
  });

  it('redirects to / when user is exhibitor, not admin', async () => {
    setAuth();
    setProfile('exhibitor', 'active');
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
  });

  it('returns user when user is admin', async () => {
    setAuth('admin-1', 'admin@test.com');
    setProfile('admin', 'active');
    const user = await requireAdmin();
    expect(user.id).toBe('admin-1');
  });
});

// ---------- requireArtistActive ----------

describe('requireArtistActive', () => {
  beforeEach(async () => {
    await loadGuards();
  });

  it('redirects to /login when not authenticated', async () => {
    mockAuthError = new Error('not authenticated');
    await expect(requireArtistActive()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects admin to /admin/dashboard', async () => {
    setAuth();
    setProfile('admin', 'active');
    await expect(requireArtistActive()).rejects.toThrow('REDIRECT:/admin/dashboard');
  });

  it('redirects suspended artist to /dashboard/suspended', async () => {
    setAuth();
    setProfile('artist', 'suspended');
    setApplication({ artist_name: 'test' });
    await expect(requireArtistActive()).rejects.toThrow('REDIRECT:/dashboard/suspended');
  });

  it('redirects pending artist with application to /dashboard/pending', async () => {
    setAuth();
    setProfile('artist', 'pending');
    setApplication({
      artist_name: 'test',
      contact: '010',
      bio: 'bio',
      terms_version: ARTIST_APPLICATION_TERMS_VERSION,
      terms_accepted_at: '2024-01-01',
      privacy_version: PRIVACY_POLICY_VERSION,
      privacy_accepted_at: '2024-01-01',
      tos_version: TERMS_OF_SERVICE_VERSION,
      tos_accepted_at: '2024-01-01',
    });
    await expect(requireArtistActive()).rejects.toThrow('REDIRECT:/dashboard/pending');
  });

  it('redirects non-artist user to /onboarding', async () => {
    setAuth();
    setProfile('user', 'active');
    await expect(requireArtistActive()).rejects.toThrow('REDIRECT:/onboarding');
  });

  it('returns user when artist is active with valid application', async () => {
    setAuth('artist-1');
    setProfile('artist', 'active');
    setApplication({
      artist_name: 'test',
      contact: '010',
      bio: 'bio',
      terms_version: ARTIST_APPLICATION_TERMS_VERSION,
      terms_accepted_at: '2024-01-01',
      privacy_version: PRIVACY_POLICY_VERSION,
      privacy_accepted_at: '2024-01-01',
      tos_version: TERMS_OF_SERVICE_VERSION,
      tos_accepted_at: '2024-01-01',
    });
    const user = await requireArtistActive();
    expect(user.id).toBe('artist-1');
  });
});

// ---------- requireExhibitor ----------

describe('requireExhibitor', () => {
  beforeEach(async () => {
    await loadGuards();
  });

  it('redirects to /login when not authenticated', async () => {
    mockAuthError = new Error('not authenticated');
    await expect(requireExhibitor()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects admin to /admin/dashboard', async () => {
    setAuth();
    setProfile('admin', 'active');
    await expect(requireExhibitor()).rejects.toThrow('REDIRECT:/admin/dashboard');
  });

  it('redirects non-exhibitor to /', async () => {
    setAuth();
    setProfile('artist', 'active');
    await expect(requireExhibitor()).rejects.toThrow('REDIRECT:/');
  });

  it('redirects suspended exhibitor to /exhibitor/suspended', async () => {
    setAuth();
    setProfile('exhibitor', 'suspended');
    setApplication({ representative_name: 'test' });
    await expect(requireExhibitor()).rejects.toThrow('REDIRECT:/exhibitor/suspended');
  });

  it('redirects pending exhibitor with application to /exhibitor/pending', async () => {
    setAuth();
    setProfile('exhibitor', 'pending');
    setApplication({
      representative_name: 'test',
      contact: '010',
      bio: 'bio',
      terms_version: EXHIBITOR_APPLICATION_TERMS_VERSION,
      terms_accepted_at: '2024-01-01',
      privacy_version: PRIVACY_POLICY_VERSION,
      privacy_accepted_at: '2024-01-01',
      tos_version: TERMS_OF_SERVICE_VERSION,
      tos_accepted_at: '2024-01-01',
    });
    await expect(requireExhibitor()).rejects.toThrow('REDIRECT:/exhibitor/pending');
  });

  it('returns user when exhibitor is active with valid application', async () => {
    setAuth('exhibitor-1');
    setProfile('exhibitor', 'active');
    setApplication({
      representative_name: 'test',
      contact: '010',
      bio: 'bio',
      terms_version: EXHIBITOR_APPLICATION_TERMS_VERSION,
      terms_accepted_at: '2024-01-01',
      privacy_version: PRIVACY_POLICY_VERSION,
      privacy_accepted_at: '2024-01-01',
      tos_version: TERMS_OF_SERVICE_VERSION,
      tos_accepted_at: '2024-01-01',
    });
    const user = await requireExhibitor();
    expect(user.id).toBe('exhibitor-1');
  });
});
