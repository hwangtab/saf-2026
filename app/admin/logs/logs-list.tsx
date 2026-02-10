'use client';

import Link from 'next/link';
import type { AdminLogEntry } from '@/app/actions/admin-logs';
import Button from '@/components/ui/Button';
import { AdminCard } from '@/app/admin/_components/admin-ui';

type LogsListProps = {
  logs: AdminLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
};

function formatActionDescription(log: AdminLogEntry): string {
  const details = log.details as Record<string, unknown> | null;

  switch (log.action) {
    case 'user_approved':
      return `사용자 승인: ${details?.user_name || log.target_id}`;
    case 'user_rejected':
      return `사용자 거절: ${details?.user_name || log.target_id}`;
    case 'user_reactivated':
      return `사용자 재활성화: ${details?.user_name || log.target_id}`;
    case 'user_role_changed':
      return `권한 변경: ${details?.user_name || ''} → ${details?.to}`;
    case 'artwork_updated':
      return `작품 수정: ${details?.title || log.target_id}`;
    case 'artwork_deleted':
      return `작품 삭제: ${details?.title || log.target_id}`;
    case 'artwork_images_updated':
      return `작품 이미지 변경`;
    case 'artist_updated':
      return `작가 정보 수정: ${details?.name || log.target_id}`;
    case 'artist_deleted':
      return `작가 삭제: ${details?.name || log.target_id}`;
    case 'content_created':
      return `콘텐츠 생성: ${log.target_type} - ${details?.title || log.target_id}`;
    case 'content_updated':
      return `콘텐츠 수정: ${log.target_type} - ${details?.title || log.target_id}`;
    case 'content_deleted':
      return `콘텐츠 삭제: ${log.target_type} - ${log.target_id}`;
    case 'batch_artwork_status':
      return `일괄 상태 변경: ${details?.count}건 → ${details?.status}`;
    case 'batch_artwork_visibility':
      return `일괄 숨김 변경: ${details?.count}건`;
    case 'batch_artwork_deleted':
      return `일괄 삭제: ${details?.count}건`;
    default:
      return log.action;
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTargetTypeLabel(type: string | null) {
  switch (type) {
    case 'user':
      return '사용자';
    case 'artwork':
      return '작품';
    case 'artist':
      return '작가';
    case 'news':
      return '뉴스';
    case 'faq':
      return 'FAQ';
    case 'testimonial':
      return '후기';
    case 'video':
      return '영상';
    default:
      return type || '-';
  }
}

function getTargetLink(log: AdminLogEntry): string | null {
  if (!log.target_id) return null;

  switch (log.target_type) {
    case 'user':
      return '/admin/users';
    case 'artwork':
      return `/admin/artworks/${log.target_id}`;
    case 'artist':
      return `/admin/artists/${log.target_id}`;
    default:
      return null;
  }
}

export function LogsList({ logs, currentPage, totalPages, total }: LogsListProps) {
  if (logs.length === 0) {
    return (
      <div className="space-y-4">
        <AdminCard className="p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">활동 로그가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">관리자 활동이 기록되면 여기에 표시됩니다.</p>
        </AdminCard>
        <p className="text-sm text-gray-500">총 0개의 기록</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminCard className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                시간
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                관리자
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                활동
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                대상
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const link = getTargetLink(log);
              return (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                    {log.admin?.name || log.admin?.email || '(알 수 없음)'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                    {formatActionDescription(log)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {link ? (
                      <Link href={link} className="text-indigo-600 hover:underline">
                        {getTargetTypeLabel(log.target_type)}
                      </Link>
                    ) : (
                      getTargetTypeLabel(log.target_type)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminCard>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          총 {total}개의 기록 (페이지 {currentPage} / {totalPages})
        </p>
        <div className="flex gap-2">
          {currentPage > 1 && (
            <Button variant="white" href={`/admin/logs?page=${currentPage - 1}`}>
              이전
            </Button>
          )}
          {currentPage < totalPages && (
            <Button variant="white" href={`/admin/logs?page=${currentPage + 1}`}>
              다음
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
