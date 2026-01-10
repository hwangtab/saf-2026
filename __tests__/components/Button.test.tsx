import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    // Default is primary
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-white');
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
    expect(button).toHaveClass('bg-accent');
    expect(button).toHaveClass('text-white');
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
    // Text should still be present
    expect(screen.getByText('Loading')).toBeInTheDocument();
    // Spinner should be present (checking by class)
    const spinner = button.querySelector('.rounded-full');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom class names', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });
});
