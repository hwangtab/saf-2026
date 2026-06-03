import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactSearch } from '@/app/(portal)/admin/email/_components/ContactSearch';
import { searchContacts } from '@/app/actions/admin-contact-search';

jest.mock('@/app/actions/admin-contact-search', () => ({ searchContacts: jest.fn() }));

describe('ContactSearch', () => {
  it('검색 결과를 담으면 선택 목록에 추가된다', async () => {
    (searchContacts as jest.Mock).mockResolvedValue({
      results: [{ email: 'a@x.com', name: '구매자A', sources: ['구매자'], suppressed: false }],
      truncated: false,
    });
    const onChange = jest.fn();
    render(<ContactSearch selected={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('연락처 검색'), { target: { value: '구매자' } });
    fireEvent.click(screen.getByText('검색'));
    await waitFor(() => screen.getByText(/a@x.com/));
    fireEvent.click(screen.getByRole('button', { name: '담기' }));
    expect(onChange).toHaveBeenCalledWith([{ email: 'a@x.com', name: '구매자A' }]);
  });

  it('suppression된 결과는 담기 버튼이 비활성화된다', async () => {
    (searchContacts as jest.Mock).mockResolvedValue({
      results: [{ email: 'b@x.com', name: '차단', sources: ['서명자'], suppressed: true }],
      truncated: false,
    });
    render(<ContactSearch selected={[]} onChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('연락처 검색'), { target: { value: '차단' } });
    fireEvent.click(screen.getByText('검색'));
    await waitFor(() => screen.getByText(/b@x.com/));
    expect(screen.getByRole('button', { name: '수신거부됨' })).toBeDisabled();
  });
});
