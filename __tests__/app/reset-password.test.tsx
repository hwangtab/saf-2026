import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ResetPasswordPage from '@/app/(auth)/reset-password/page';

const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
    },
  })),
}));

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('next-intl', () => ({
  useLocale: () => 'ko',
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href }: React.PropsWithChildren<{ href: string }>) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('@/components/ui/Button', () => {
  return function MockButton({
    children,
    type = 'button',
    disabled,
  }: React.PropsWithChildren<{
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }>) {
    return (
      <button type={type} disabled={disabled}>
        {children}
      </button>
    );
  };
});

jest.mock('@/components/common/SafeImage', () => {
  return function MockImage({ alt }: { alt: string }) {
    return <img alt={alt} />;
  };
});

jest.mock('@/components/ui/SawtoothDivider', () => ({
  SAWTOOTH_TOP_SAFE_PADDING: 'pb-24',
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to forgot-password when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/forgot-password?error=session_expired');
    });
  });

  it('renders form when session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument();
      expect(screen.getByLabelText('새 비밀번호 확인')).toBeInTheDocument();
    });
  });

  it('shows weak password error for <8 chars', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'short' } });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/너무 짧습니다/);
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows mismatch error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'password1234' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
      target: { value: 'different5678' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/일치하지 않습니다/);
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('updates password + signs out + redirects on success', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    mockUpdateUser.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
    });
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/login?reset=success');
    });
  });

  it('shows error when updateUser fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    mockUpdateUser.mockResolvedValue({ error: { message: 'server error' } });
    render(<ResetPasswordPage />);
    await waitFor(() => screen.getByLabelText('새 비밀번호'));

    fireEvent.change(screen.getByLabelText('새 비밀번호'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '비밀번호 변경' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/오류가 발생했습니다/);
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
