import { SVGProps } from 'react';
import clsx from 'clsx';

interface MenuToggleIconProps extends SVGProps<SVGSVGElement> {
  isOpen: boolean;
}

export default function MenuToggleIcon({ isOpen, className, ...props }: MenuToggleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx('overflow-visible', className)}
      {...props}
    >
      <line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        className={clsx(
          'transition-all duration-300 ease-in-out origin-center',
          isOpen ? 'translate-y-[6px] rotate-45' : 'translate-y-0 rotate-0'
        )}
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        className={clsx(
          'transition-opacity duration-300 ease-in-out',
          isOpen ? 'opacity-0' : 'opacity-100'
        )}
      />
      <line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        className={clsx(
          'transition-all duration-300 ease-in-out origin-center',
          isOpen ? '-translate-y-[6px] -rotate-45' : 'translate-y-0 rotate-0'
        )}
      />
    </svg>
  );
}
