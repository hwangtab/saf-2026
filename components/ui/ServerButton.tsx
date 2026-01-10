import Link from 'next/link';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { buttonVariants } from './Button';

export interface ServerButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  href: string;
  external?: boolean;
  className?: string;
}

export default function ServerButton({
  children,
  href,
  variant,
  size,
  external = false,
  className = '',
}: ServerButtonProps) {
  const styles = cn(buttonVariants({ variant, size }), className);

  if (external) {
    return (
      <a href={href} className={styles} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={styles}>
      {children}
    </Link>
  );
}
