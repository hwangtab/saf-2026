'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  baseUrl: string;
  itemName?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  baseUrl,
  itemName = '항목',
}: PaginationProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  // 표시할 페이지 번호 계산 (최대 7개)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // 7페이지 이하면 전부 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 7페이지 초과시 축약 표시
      if (currentPage <= 4) {
        // 앞부분: 1 2 3 4 5 ... 10
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // 뒷부분: 1 ... 6 7 8 9 10
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        // 중간: 1 ... 4 5 6 ... 10
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col items-center gap-3 py-4 sm:flex-row sm:justify-between">
      <p className="text-sm text-gray-500">
        총 {totalItems.toLocaleString()}개 {itemName}
      </p>

      <nav className="flex items-center gap-1" aria-label="페이지네이션">
        {/* 이전 버튼 */}
        {currentPage > 1 ? (
          <Link
            href={getPageUrl(currentPage - 1)}
            className="flex h-8 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            이전
          </Link>
        ) : (
          <span className="flex h-8 cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-400">
            이전
          </span>
        )}

        {/* 페이지 번호 */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-sm text-gray-400"
                >
                  ...
                </span>
              );
            }

            const isCurrentPage = page === currentPage;

            return (
              <Link
                key={page}
                href={getPageUrl(page)}
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors',
                  isCurrentPage
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
                aria-current={isCurrentPage ? 'page' : undefined}
              >
                {page}
              </Link>
            );
          })}
        </div>

        {/* 다음 버튼 */}
        {currentPage < totalPages ? (
          <Link
            href={getPageUrl(currentPage + 1)}
            className="flex h-8 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            다음
          </Link>
        ) : (
          <span className="flex h-8 cursor-not-allowed items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-400">
            다음
          </span>
        )}
      </nav>
    </div>
  );
}
