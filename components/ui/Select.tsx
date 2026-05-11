import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
  iconClassName?: string;
  children?: ReactNode;
};

const BASE =
  'w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-10 py-2.5 text-base text-charcoal-deep ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ' +
  'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed';

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, wrapperClassName, iconClassName, children, ...props },
  ref
) {
  return (
    <div className={clsx('relative', wrapperClassName)}>
      <select ref={ref} className={clsx(BASE, className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className={clsx(
          'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-soft',
          iconClassName
        )}
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

export default Select;
