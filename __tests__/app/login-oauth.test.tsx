import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSignInWithOAuth = jest.fn();
const mockFetch = jest.fn();

jest.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: jest.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('next-intl', () => ({
  useLocale: () => 'ko',
}));

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    onClick,
    type = 'button',
    disabled,
  }: React.PropsWithChildren<{
    onClick?: () => void | Promise<void>;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>) {
    return (
      <button type={type} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  };
});

const LoginPage = require('@/app/(auth)/login/page')
  .default as typeof import('@/app/(auth)/login/page').default;

describe('LoginPage OAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        redirectTo: 'https://example.com/auth/callback?oauth_nonce=nonce-1',
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('passes redirectTo only when starting Google OAuth', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '구글로 계속하기' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/oauth/state', {
        method: 'POST',
        cache: 'no-store',
      });
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'https://example.com/auth/callback?oauth_nonce=nonce-1',
        },
      });
    });
  });
});
