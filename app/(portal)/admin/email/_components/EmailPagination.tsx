'use client';

import clsx from 'clsx';

type EmailPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  onPageSizeChange: (next: number) => void;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function EmailPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: EmailPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
      <p className="text-xs tabular-nums text-charcoal-muted">
        총 <span className="font-semibold text-charcoal-deep">{total.toLocaleString('ko-KR')}</span>
        건 · {page}/{totalPages} 페이지
      </p>

      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-md border border-gray-300 bg-white py-1 pl-2 pr-6 text-xs text-charcoal-deep focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="페이지당 표시 개수"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}개씩
            </option>
          ))}
        </select>

        <nav className="inline-flex gap-1" aria-label="페이지 탐색">
          <PageButton
            onClick={() => onPageChange(1)}
            disabled={isFirst}
            aria-label="첫 페이지"
            title="첫 페이지"
          >
            «
          </PageButton>
          <PageButton
            onClick={() => onPageChange(page - 1)}
            disabled={isFirst}
            aria-label="이전 페이지"
            title="이전 페이지"
          >
            ‹
          </PageButton>
          {buildPageWindow(page, totalPages).map((item, index) =>
            item === null ? (
              <span key={`ellipsis-${index}`} className="select-none px-1 text-charcoal-muted">
                …
              </span>
            ) : (
              <PageButton
                key={item}
                onClick={() => onPageChange(item)}
                disabled={item === page}
                current={item === page}
                aria-label={`${item}페이지`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </PageButton>
            )
          )}
          <PageButton
            onClick={() => onPageChange(page + 1)}
            disabled={isLast}
            aria-label="다음 페이지"
            title="다음 페이지"
          >
            ›
          </PageButton>
          <PageButton
            onClick={() => onPageChange(totalPages)}
            disabled={isLast}
            aria-label="마지막 페이지"
            title="마지막 페이지"
          >
            »
          </PageButton>
        </nav>
      </div>
    </div>
  );
}

function PageButton({
  children,
  current,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { current?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={clsx(
        'min-w-[28px] rounded px-1.5 py-1 text-xs font-medium transition-colors',
        current
          ? 'bg-primary-strong text-white'
          : 'border border-gray-300 bg-white text-charcoal-deep hover:bg-gray-50',
        disabled && !current && 'pointer-events-none opacity-40'
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function buildPageWindow(page: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: Array<number | null> = [1];
  if (page > 3) pages.push(null);
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p += 1) {
    pages.push(p);
  }
  if (page < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}
