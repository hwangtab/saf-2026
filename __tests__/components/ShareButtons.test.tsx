import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareButtons from '../../components/common/ShareButtons';

jest.mock('../../lib/hooks/useKakaoSDK', () => ({
  useKakaoSDK: jest.fn(() => ({ isReady: true })),
}));

jest.mock('next-image-export-optimizer', () => ({
  __esModule: true,
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

jest.mock('react-share/lib/FacebookShareButton', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => (
    <button data-testid="facebook-share" {...props}>
      {children}
    </button>
  ),
}));

jest.mock('react-share/lib/TwitterShareButton', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => (
    <button data-testid="twitter-share" {...props}>
      {children}
    </button>
  ),
}));

jest.mock('react-share/lib/FacebookIcon', () => ({
  __esModule: true,
  default: () => <span>FB Icon</span>,
}));

jest.mock('react-share/lib/TwitterIcon', () => ({
  __esModule: true,
  default: () => <span>Twitter Icon</span>,
}));

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const mockKakaoSendDefault = jest.fn();
(window as any).Kakao = {
  Link: {
    sendDefault: mockKakaoSendDefault,
  },
};

describe('ShareButtons', () => {
  const defaultProps = {
    url: 'https://example.com',
    title: 'Test Title',
    description: 'Test Description',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all share buttons', () => {
    render(<ShareButtons {...defaultProps} />);

    expect(screen.getByTestId('facebook-share')).toBeInTheDocument();
    expect(screen.getByTestId('twitter-share')).toBeInTheDocument();
    expect(screen.getByTitle('카카오톡 공유')).toBeInTheDocument();
    expect(screen.getByTitle('링크 복사')).toBeInTheDocument();
  });

  it('handles link copying successfully', async () => {
    (navigator.clipboard.writeText as jest.Mock).mockResolvedValueOnce(undefined);

    render(<ShareButtons {...defaultProps} />);

    const copyButton = screen.getByTitle('링크 복사');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);

    await waitFor(() => {
      expect(screen.getByLabelText('링크가 복사되었습니다')).toBeInTheDocument();
    });
  });

  it('handles link copying failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

    render(<ShareButtons {...defaultProps} />);

    const copyButton = screen.getByTitle('링크 복사');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByLabelText('복사 실패')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('handles Kakao share when ready', () => {
    render(<ShareButtons {...defaultProps} />);

    const kakaoButton = screen.getByTitle('카카오톡 공유');
    fireEvent.click(kakaoButton);

    expect(mockKakaoSendDefault).toHaveBeenCalledWith(
      expect.objectContaining({
        objectType: 'feed',
        content: expect.objectContaining({
          title: defaultProps.title,
          description: defaultProps.description,
        }),
      })
    );
  });
});
