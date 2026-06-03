import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactSearch } from '@/app/(portal)/admin/email/_components/ContactSearch';
import { searchContacts } from '@/app/actions/admin-contact-search';

jest.mock('@/app/actions/admin-contact-search', () => ({ searchContacts: jest.fn() }));

describe('ContactSearch', () => {
  it('검색 결과를 추가하면 선택 목록에 추가된다', async () => {
    (searchContacts as jest.Mock).mockResolvedValue({
      results: [{ email: 'a@x.com', name: '구매자A', sources: ['구매자'], suppressed: false }],
      truncated: false,
    });
    const onChange = jest.fn();
    render(<ContactSearch selected={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('명단에서 찾아 추가'), { target: { value: '구매자' } });
    fireEvent.click(screen.getByText('찾기'));
    await waitFor(() => screen.getByText(/a@x.com/));
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(onChange).toHaveBeenCalledWith([{ email: 'a@x.com', name: '구매자A' }]);
  });

  it('suppression된 결과는 추가 버튼이 비활성화된다', async () => {
    (searchContacts as jest.Mock).mockResolvedValue({
      results: [{ email: 'b@x.com', name: '차단', sources: ['서명자'], suppressed: true }],
      truncated: false,
    });
    render(<ContactSearch selected={[]} onChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('명단에서 찾아 추가'), { target: { value: '차단' } });
    fireEvent.click(screen.getByText('찾기'));
    await waitFor(() => screen.getByText(/b@x.com/));
    expect(screen.getByRole('button', { name: '수신거부됨' })).toBeDisabled();
  });

  it('선택된 수신자를 개별 또는 전체 해제할 수 있다', () => {
    const onChange = jest.fn();
    render(
      <ContactSearch
        selected={[
          { email: 'a@x.com', name: '구매자A' },
          { email: 'b@x.com', name: null },
        ]}
        onChange={onChange}
      />
    );

    expect(screen.getByText('선택된 받는 사람 2명')).toBeInTheDocument();
    expect(screen.getByText('a@x.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'a@x.com 제거' }));
    expect(onChange).toHaveBeenCalledWith([{ email: 'b@x.com', name: null }]);

    fireEvent.click(screen.getByRole('button', { name: '선택 전체 해제' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
