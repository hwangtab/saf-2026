import { render, screen } from '@testing-library/react';
import FirstBankAccessChart from '../../../../components/features/charts/FirstBankAccessChart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => (
    <div data-testid="pie">
      {data.map((item: any, i: number) => (
        <div key={i} data-testid="pie-cell" data-value={item.value}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

jest.mock('../../../../components/ui/ChartContainer', () => ({
  __esModule: true,
  default: ({ title, children }: any) => (
    <div data-testid="chart-container">
      <h2>{title}</h2>
      {typeof children === 'function'
        ? children({ pieOuterRadius: 100, pieInnerRadius: 50 })
        : children}
    </div>
  ),
}));

describe('FirstBankAccessChart', () => {
  it('renders correctly with data', () => {
    render(<FirstBankAccessChart />);

    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    expect(screen.getByText('제1금융권 접근 현황')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    const cells = screen.getAllByTestId('pie-cell');
    expect(cells.length).toBeGreaterThan(0);
  });
});
