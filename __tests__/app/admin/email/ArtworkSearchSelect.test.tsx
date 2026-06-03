import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { searchBroadcastArtworks } from '@/app/actions/admin-broadcast';
import { ArtworkSearchSelect } from '@/app/(portal)/admin/email/_components/ArtworkSearchSelect';

jest.mock('@/app/actions/admin-broadcast', () => ({
  searchBroadcastArtworks: jest.fn(),
}));

describe('ArtworkSearchSelect', () => {
  it('작품명 검색 결과를 선택하면 작품 ID를 전달한다', async () => {
    (searchBroadcastArtworks as jest.Mock).mockResolvedValue({
      total: 1,
      results: [
        {
          id: 'artwork-1',
          title: '푸른 소나무',
          titleEn: null,
          artistName: '홍길동',
          artistNameEn: null,
          status: 'sold',
          image: null,
        },
      ],
    });
    const onChange = jest.fn();

    render(<ArtworkSearchSelect value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('작품 검색'), { target: { value: '소나무' } });

    await waitFor(() => expect(searchBroadcastArtworks).toHaveBeenCalledWith('소나무'));
    fireEvent.click(screen.getByRole('button', { name: /푸른 소나무/ }));

    expect(onChange).toHaveBeenCalledWith('artwork-1');
  });

  it('선택된 작품을 다시 선택 상태로 되돌릴 수 있다', async () => {
    (searchBroadcastArtworks as jest.Mock).mockResolvedValue({
      total: 1,
      results: [
        {
          id: 'artwork-1',
          title: '푸른 소나무',
          titleEn: null,
          artistName: '홍길동',
          artistNameEn: null,
          status: 'sold',
          image: null,
        },
      ],
    });
    const onChange = jest.fn();

    render(<ArtworkSearchSelect value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('작품 검색'), { target: { value: '소나무' } });

    await waitFor(() => screen.getByRole('button', { name: /푸른 소나무/ }));
    fireEvent.click(screen.getByRole('button', { name: /푸른 소나무/ }));
    fireEvent.click(screen.getByRole('button', { name: '다시 선택' }));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
