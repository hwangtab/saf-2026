import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-gray-100'); // Default secondary variant
  });

  it('renders primary variant correctly', () => {
    render(<Button variant="primary">Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-white');
  });

  it('renders accent variant correctly', () => {
    render(<Button variant="accent">Donate</Button>);
    const button = screen.getByRole('button', { name: /donate/i });
    expect(button).toHaveClass('bg-red-50');
    expect(button).toHaveClass('text-red-500');
  });

  it('renders as a link when href is provided', () => {
    render(<Button href="/about">Link Button</Button>);
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/about');
  });

  it('shows loading state correctly', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Loading spinner should be present (though specific check depends on implementation)
    // We can check if children are still rendered or hidden/replaced
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('renders with custom class names', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });
});
