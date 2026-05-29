import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

const mockRequestPasswordReset = jest.fn();
jest.mock('@/app/(auth)/forgot-password/actions', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
}));

const mockSearchParamsGet = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
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

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsGet.mockReturnValue(null);
  });

  it('renders email input and submit button', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText('이메일 주소')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '재설정 링크 보내기' })).toBeInTheDocument();
  });

  it('shows success message on sent', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'sent' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/재설정 링크를 이메일로 보냈습니다/);
    });
  });

  it('shows not_found message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'not_found' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'u@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/등록되지 않은 이메일입니다/);
    });
  });

  it('shows social_only message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'social_only', provider: 'google' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'u@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Google로 가입한 계정/);
    });
  });

  it('shows rate_limited message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ status: 'rate_limited' });
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'u@example.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '재설정 링크 보내기' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/요청이 너무 많습니다/);
    });
  });

  it('shows invalid_link error from query param', () => {
    mockSearchParamsGet.mockImplementation((k: string) => (k === 'error' ? 'invalid_link' : null));
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/만료되었거나 유효하지 않습니다/);
  });

  it('shows session_expired error from query param', () => {
    mockSearchParamsGet.mockImplementation((k: string) =>
      k === 'error' ? 'session_expired' : null
    );
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/세션이 만료되었습니다/);
  });
});
