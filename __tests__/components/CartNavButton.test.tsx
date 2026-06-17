/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import CartNavButton from '@/components/common/Header/CartNavButton';

const mockOpenDrawer = jest.fn();
let mockMounted = false;

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => (key === 'headerLabel' ? 'Cart' : key),
}));

jest.mock('@/components/providers/CartProvider', () => ({
  useCart: () => ({
    count: 0,
    mounted: mockMounted,
    openDrawer: mockOpenDrawer,
  }),
}));

describe('CartNavButton', () => {
  beforeEach(() => {
    mockOpenDrawer.mockClear();
    mockMounted = false;
  });

  it('cart provider hydration 전에는 클릭 가능한 버튼으로 동작하지 않는다', () => {
    render(<CartNavButton textColor="text-black" />);

    const button = screen.getByRole('button', { name: 'Cart' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(mockOpenDrawer).not.toHaveBeenCalled();
  });

  it('cart provider hydration 후에는 drawer를 연다', () => {
    mockMounted = true;
    render(<CartNavButton textColor="text-black" />);

    const button = screen.getByRole('button', { name: 'Cart' });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
  });
});
