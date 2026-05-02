import { cva, type VariantProps } from 'class-variance-authority';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconLayout = 'inline' | 'fixed-left';

export const FIXED_LEFT_ICON_OFFSET: Record<ButtonSize, string> = {
  xs: 'left-3',
  sm: 'left-4',
  md: 'left-6',
  lg: 'left-8',
};

// Gallery White Cube 모델: 호버에 scale/translate 사용 금지. 색·그림자만 변화.
// (Apple/Tesla/Figma 갤러리 사이트의 정적 인터랙션 패턴)
export const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold rounded-lg transition-[box-shadow,color,background-color,border-color] duration-300 ease-out group',
  {
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary-strong text-white hover:shadow-gallery-artwork',
        secondary: 'bg-gray-900 hover:bg-gray-800 text-white hover:shadow-gallery-artwork',
        outline:
          'border border-gray-200 hover:border-primary hover:text-primary bg-white text-gray-700 hover:shadow-gallery-card',
        'outline-white':
          'border border-white/50 text-white bg-transparent hover:bg-white hover:text-gray-900 hover:border-white',
        white:
          'bg-white border border-gray-200 text-gray-900 hover:border-primary hover:text-primary hover:shadow-gallery-card',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-primary',
        'ghost-white': 'bg-transparent text-white/90 hover:bg-white/10 hover:text-white',
      },
      size: {
        xs: 'px-3 py-1.5 text-sm min-h-[36px]',
        sm: 'px-4 py-2 text-sm min-h-[44px]',
        md: 'px-6 py-2.5 text-base min-h-[44px]',
        lg: 'px-8 py-4 text-lg min-h-[52px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonStyleProps = VariantProps<typeof buttonVariants>;
