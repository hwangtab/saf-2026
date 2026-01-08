import {
  getTooltipProps,
  CHART_COLORS,
  tooltipLabelStyle,
  tooltipItemStyle,
} from '@/lib/chartConfig';

describe('chartConfig', () => {
  it('should export correct color palette', () => {
    expect(CHART_COLORS.primary).toBe('#4F46E5');
    expect(CHART_COLORS.danger).toBe('#DC2626');
  });

  it('should export correct tooltip styles', () => {
    expect(tooltipLabelStyle).toHaveProperty('fontSize', '0.75rem');
    expect(tooltipItemStyle).toHaveProperty('fontWeight', 600);
  });

  it('should return consistent tooltip props', () => {
    const props = getTooltipProps();
    expect(props).toHaveProperty('labelStyle');
    expect(props).toHaveProperty('itemStyle');
    expect(props).toHaveProperty('contentStyle');
    expect(props.contentStyle).toHaveProperty('backgroundColor', 'rgba(255, 255, 255, 0.95)');
  });
});
