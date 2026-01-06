import { render, screen, waitFor } from '@testing-library/react';
import DynamicCounter from '@/components/features/DynamicCounter';

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: jest.fn(() => ({
    ref: jest.fn(),
    inView: true,
  })),
}));

describe('DynamicCounter', () => {
  const mockItems = [
    { label: '예술인 지원', value: 150, unit: '명' },
    { label: '조성 기금', value: 1000000, unit: '원' },
    { label: '대출 건수', value: 50, unit: '건' },
  ];

  it('renders all counter items', () => {
    render(<DynamicCounter items={mockItems} />);

    expect(screen.getByText('예술인 지원')).toBeInTheDocument();
    expect(screen.getByText('조성 기금')).toBeInTheDocument();
    expect(screen.getByText('대출 건수')).toBeInTheDocument();
  });

  it('displays correct units for each item', () => {
    render(<DynamicCounter items={mockItems} />);

    // Check for specific units (avoid matching labels which also contain these characters)
    expect(screen.getByText('명')).toBeInTheDocument();
    expect(screen.getByText('원')).toBeInTheDocument();
    expect(screen.getByText('건')).toBeInTheDocument();
  });

  it('starts counting when component is in view', async () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue({ ref: jest.fn(), inView: true });

    render(<DynamicCounter items={mockItems} />);

    // CountUp component should be rendered when in view
    await waitFor(
      () => {
        expect(screen.getByText(/150|1,000,000|50/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('shows 0 when not in view', () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue({ ref: jest.fn(), inView: false });

    render(<DynamicCounter items={mockItems} />);

    // Should show 0 with units when not started
    expect(screen.getByText('0명')).toBeInTheDocument();
    expect(screen.getByText('0원')).toBeInTheDocument();
    expect(screen.getByText('0건')).toBeInTheDocument();
  });
});
