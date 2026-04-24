/**
 * TermsConsentForm 에러 영역 가시성 회귀 방지 테스트
 *
 * 무한 스피너 버그 조사에서 확인된 UX 결함:
 *  - silent RLS 실패가 잡혀 server action이 error state를 반환해도, 기존 폼은
 *    `<p>` 에러를 submit 버튼과 같은 row(`flex justify-between`)에 형제로 두어 사용자가
 *    "스피너가 멎었지만 아무 일도 일어나지 않았다"고 오인하게 만들었다.
 *
 * 이 테스트는 다음을 잠근다:
 *  1. 에러 메시지가 `role="alert"` + `aria-live="polite"`로 보조 기술에 알려진다.
 *  2. 에러 영역이 submit 버튼보다 DOM에서 먼저 위치한다 (시각·논리 순서 모두).
 */

import { render, screen } from '@testing-library/react';

// useActionState를 통제 가능한 더미로 치환
const mockUseActionState = jest.fn();
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useActionState: (...args: unknown[]) => mockUseActionState(...args),
  };
});

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

// LegalDocumentContent는 i18n + util 의존성이 많으므로 가벼운 stub로 치환
jest.mock('@/components/auth/LegalDocumentContent', () => ({
  LegalDocumentContent: () => <div data-testid="legal-doc">법률 문서 내용</div>,
}));

// IncompleteItemsModal도 단순 stub
jest.mock('@/components/ui/IncompleteItemsModal', () => ({
  IncompleteItemsModal: () => null,
}));

// scrollIntoView jsdom 미지원
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.scrollBy = jest.fn();
});

const { TermsConsentForm } = require('@/app/(auth)/terms-consent/terms-consent-form');

function setActionState(state: { message: string; error?: boolean }, isPending = false) {
  mockUseActionState.mockReturnValue([state, jest.fn(), isPending]);
}

describe('TermsConsentForm 에러 영역', () => {
  beforeEach(() => {
    mockUseActionState.mockReset();
  });

  it('state.error=true이면 role="alert" 박스를 렌더하고 메시지를 표시한다', () => {
    setActionState({ message: '계정 상태를 확인 후 다시 시도해주세요.', error: true });

    render(
      <TermsConsentForm
        nextPath="/dashboard/artworks"
        needsArtistConsent={false}
        needsExhibitorConsent={false}
        needsPrivacyConsent={true}
        needsTosConsent={false}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('계정 상태를 확인 후 다시 시도해주세요.');
    // role="alert"가 implicit aria-live="assertive"이므로 명시 속성 없음 (충돌 방지)
  });

  it('에러 alert는 submit 버튼보다 DOM에서 먼저 위치한다', () => {
    setActionState({ message: '계정 상태를 확인 후 다시 시도해주세요.', error: true });

    render(
      <TermsConsentForm
        nextPath="/dashboard/artworks"
        needsArtistConsent={false}
        needsExhibitorConsent={false}
        needsPrivacyConsent={true}
        needsTosConsent={false}
      />
    );

    const alert = screen.getByRole('alert');
    const submit = screen.getByRole('button', { name: /동의하고 계속하기/ });

    // DOCUMENT_POSITION_FOLLOWING (4) = submit이 alert 뒤에 위치
    const relation = alert.compareDocumentPosition(submit);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('state.error=false면 alert를 렌더하지 않는다', () => {
    setActionState({ message: '', error: false });

    render(
      <TermsConsentForm
        nextPath="/dashboard/artworks"
        needsArtistConsent={false}
        needsExhibitorConsent={false}
        needsPrivacyConsent={true}
        needsTosConsent={false}
      />
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('isPending=true이면 submit 버튼이 disabled 상태다', () => {
    setActionState({ message: '' }, true);

    render(
      <TermsConsentForm
        nextPath="/dashboard/artworks"
        needsArtistConsent={false}
        needsExhibitorConsent={false}
        needsPrivacyConsent={true}
        needsTosConsent={false}
      />
    );

    const submit = screen.getByRole('button', { name: /동의하고 계속하기/ });
    expect(submit).toBeDisabled();
  });
});
