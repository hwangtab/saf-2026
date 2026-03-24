import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareButtons from '../../components/common/ShareButtons';

jest.mock('../../lib/hooks/useKakaoSDK', () => ({
  useKakaoShareSDK: jest.fn(() => ({
    isReady: true,
    loading: false,
    error: null,
    hasAppKey: true,
    ensureLoaded: jest.fn(async () => true),
  })),
}));

jest.mock('next-image-export-optimizer', () => ({
  __esModule: true,
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
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

  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it('renders all share buttons', () => {
    render(<ShareButtons {...defaultProps} />);

    expect(screen.getByLabelText('facebookAria')).toBeInTheDocument();
    expect(screen.getByLabelText('twitterAria')).toBeInTheDocument();
    expect(screen.getByTitle('kakaoButtonTitle')).toBeInTheDocument();
    expect(screen.getByTitle('copyLinkTitle')).toBeInTheDocument();
  });

  it('opens Facebook share popup on click', () => {
    render(<ShareButtons {...defaultProps} />);

    const fbButton = screen.getByLabelText('facebookAria');
    fireEvent.click(fbButton);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('facebook.com/sharer/sharer.php'),
      '_blank',
      expect.any(String)
    );
  });

  it('opens Twitter share popup on click', () => {
    render(<ShareButtons {...defaultProps} />);

    const twitterButton = screen.getByLabelText('twitterAria');
    fireEvent.click(twitterButton);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      expect.any(String)
    );
  });

  it('handles link copying successfully', async () => {
    (navigator.clipboard.writeText as jest.Mock).mockResolvedValueOnce(undefined);

    render(<ShareButtons {...defaultProps} />);

    const copyButton = screen.getByTitle('copyLinkTitle');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(defaultProps.url);

    await waitFor(() => {
      expect(screen.getByLabelText('copied')).toBeInTheDocument();
    });
  });

  it('handles link copying failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

    render(<ShareButtons {...defaultProps} />);

    const copyButton = screen.getByTitle('copyLinkTitle');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByLabelText('copyFailed')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('handles Kakao share when ready', () => {
    render(<ShareButtons {...defaultProps} />);

    const kakaoButton = screen.getByTitle('kakaoButtonTitle');
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
