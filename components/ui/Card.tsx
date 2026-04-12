import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

export default function Card({ className, hoverable, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-sm',
        hoverable &&
          'transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl',
        className
      )}
      {...props}
    />
  );
}
