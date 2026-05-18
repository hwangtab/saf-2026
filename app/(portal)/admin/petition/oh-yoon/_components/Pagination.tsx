'use client';

import clsx from 'clsx';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  onPageSizeChange: (next: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
      <p className="text-xs text-charcoal-muted tabular-nums">
        총 <span className="font-semibold text-charcoal-deep">{total.toLocaleString('ko-KR')}</span>
        건 &middot; {page}/{totalPages} 페이지
      </p>

      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
          }}
          className="rounded-md border border-gray-300 bg-white py-1 pl-2 pr-6 text-xs text-charcoal-deep focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="페이지당 행 수"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}개씩
            </option>
          ))}
        </select>

        <nav className="inline-flex gap-1" aria-label="페이지 탐색">
          <PageBtn
            onClick={() => onPageChange(1)}
            disabled={isFirst}
            title="첫 페이지"
            aria-label="첫 페이지"
          >
            «
          </PageBtn>
          <PageBtn
            onClick={() => onPageChange(page - 1)}
            disabled={isFirst}
            title="이전 페이지"
            aria-label="이전 페이지"
          >
            ‹
          </PageBtn>
          {buildPageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`ellipsis-${i}`} className="px-1 text-charcoal-muted select-none">
                …
              </span>
            ) : (
              <PageBtn
                key={p}
                onClick={() => onPageChange(p)}
                disabled={p === page}
                current={p === page}
                aria-label={`${p}페이지`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </PageBtn>
            )
          )}
          <PageBtn
            onClick={() => onPageChange(page + 1)}
            disabled={isLast}
            title="다음 페이지"
            aria-label="다음 페이지"
          >
            ›
          </PageBtn>
          <PageBtn
            onClick={() => onPageChange(totalPages)}
            disabled={isLast}
            title="마지막 페이지"
            aria-label="마지막 페이지"
          >
            »
          </PageBtn>
        </nav>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  current,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { current?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'min-w-[28px] rounded px-1.5 py-1 text-xs font-medium transition-colors',
        current
          ? 'bg-primary-strong text-white'
          : 'border border-gray-300 bg-white text-charcoal-deep hover:bg-gray-50',
        disabled && !current && 'opacity-40 pointer-events-none'
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function buildPageWindow(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | null)[] = [1];
  if (page > 3) pages.push(null);
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) pages.push(p);
  if (page < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}
