import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

// Gallery White Cube 모델: 카드는 정적. 호버에 translate/scale 금지, 그림자만 깊이.
export default function Card({ className, hoverable, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white shadow-gallery-card',
        hoverable && 'transition-shadow duration-300 hover:shadow-gallery-hover',
        className
      )}
      {...props}
    />
  );
}
