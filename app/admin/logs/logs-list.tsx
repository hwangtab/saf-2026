'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { revertActivityLog, type ActivityLogEntry } from '@/app/actions/admin-logs';
import Button from '@/components/ui/Button';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';

type LogsListProps = {
  logs: ActivityLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
};

function formatActionDescription(log: ActivityLogEntry): string {
  const details = log.metadata as Record<string, unknown> | null;

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
    case 'artwork_created':
      return `작품 등록: ${details?.title || log.target_id}`;
    case 'artwork_deleted':
      return `작품 삭제: ${details?.title || log.target_id}`;
    case 'artwork_images_updated':
      return `작품 이미지 변경`;
    case 'artist_updated':
      return `작가 정보 수정: ${details?.name || log.target_id}`;
    case 'artist_created':
      return `작가 등록: ${details?.name || log.target_id}`;
    case 'artist_deleted':
      return `작가 삭제: ${details?.name || log.target_id}`;
    case 'artist_profile_updated':
      return `아티스트 프로필 수정: ${details?.name || log.target_id}`;
    case 'artist_artwork_created':
      return `아티스트 작품 등록: ${details?.title || log.target_id}`;
    case 'artist_artwork_updated':
      return `아티스트 작품 수정: ${details?.title || log.target_id}`;
    case 'artist_artwork_deleted':
      return `아티스트 작품 삭제: ${details?.title || log.target_id}`;
    case 'revert_executed':
      return `복구 실행: 로그 ${details?.reverted_log_id || '-'}`;
    case 'content_created':
      return `콘텐츠 생성: ${log.target_type} - ${details?.title || log.target_id}`;
    case 'content_updated':
      return `콘텐츠 수정: ${log.target_type} - ${details?.title || log.target_id}`;
    case 'content_deleted':
      return `콘텐츠 삭제: ${log.target_type} - ${log.target_id}`;
    case 'batch_artwork_status':
      return `일괄 상태 변경: ${details?.count}건 → ${formatStatus(details?.status) || details?.status}`;
    case 'batch_artwork_visibility':
      return `일괄 숨김 변경: ${details?.count}건`;
    case 'batch_artwork_deleted':
      return `일괄 삭제: ${details?.count}건`;
    default:
      return log.action;
  }
}

function getActorRoleLabel(role: ActivityLogEntry['actor_role']) {
  switch (role) {
    case 'admin':
      return '관리자';
    case 'artist':
      return '아티스트';
    case 'system':
      return '시스템';
    default:
      return role;
  }
}

function getActorDisplay(log: ActivityLogEntry) {
  if (log.actor_name) return log.actor_name;
  if (log.actor_email) return log.actor_email;
  if (log.actor_id) return `${getActorRoleLabel(log.actor_role)} #${log.actor_id.slice(0, 8)}`;
  return '(알 수 없음)';
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

function getTargetLink(log: ActivityLogEntry): string | null {
  if (!log.target_id) return null;

  if (log.target_id.includes(',')) {
    return log.target_type === 'artwork' ? '/admin/artworks' : null;
  }

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

type DiffRow = {
  field: string;
  before: unknown;
  after: unknown;
};

type DiffItem = {
  itemId: string;
  itemLabel: string | null;
  changes: DiffRow[];
};

const STATUS_LABELS: Record<string, string> = {
  available: '판매 가능',
  reserved: '예약중',
  sold: '판매 완료',
  hidden: '숨김',
};

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatIdentifier(value: string) {
  if (!value) return '-';
  if (value.includes(',')) return '다중 대상';
  if (isLikelyUuid(value)) return `식별 ID ${value.slice(0, 8)}...`;
  return value;
}

function getSnapshotDisplayName(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;

  const title = typeof snapshot.title === 'string' ? snapshot.title : null;
  const nameKo = typeof snapshot.name_ko === 'string' ? snapshot.name_ko : null;
  const name = typeof snapshot.name === 'string' ? snapshot.name : null;

  return title || nameKo || name || null;
}

function getLogTargetDisplayName(log: ActivityLogEntry): string {
  const details = log.metadata as Record<string, unknown> | null;
  const targetNameFromMetadata =
    details && typeof details.target_name === 'string' ? details.target_name : null;
  if (targetNameFromMetadata) return targetNameFromMetadata;

  const fromDetails =
    (typeof details?.title === 'string' && details.title) ||
    (typeof details?.name === 'string' && details.name) ||
    (typeof details?.user_name === 'string' && details.user_name) ||
    null;

  if (fromDetails) return fromDetails;

  const afterObj = toObject(log.after_snapshot);
  const beforeObj = toObject(log.before_snapshot);
  const fromSnapshot = getSnapshotDisplayName(afterObj) || getSnapshotDisplayName(beforeObj);
  if (fromSnapshot) return fromSnapshot;

  if (log.target_id.includes(',')) return `총 ${log.target_id.split(',').length}개 대상`;
  if (isLikelyUuid(log.target_id)) return `이름 정보 없음 (${formatIdentifier(log.target_id)})`;
  return log.target_id;
}

function formatStatus(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return STATUS_LABELS[value] || value;
}

function getTargetNameMap(log: ActivityLogEntry): Map<string, string> {
  const details = log.metadata as Record<string, unknown> | null;
  const raw = details?.target_names;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return new Map();

  const entries = Object.entries(raw).filter(
    (entry): entry is [string, string] =>
      typeof entry[0] === 'string' && typeof entry[1] === 'string'
  );

  return new Map(entries);
}

const FIELD_LABELS: Record<string, string> = {
  title: '제목',
  description: '작품 소개',
  size: '크기',
  material: '재료',
  year: '연도',
  edition: '에디션',
  price: '가격',
  status: '판매상태',
  is_hidden: '숨김',
  images: '이미지',
  shop_url: '구매 링크',
  artist_id: '작가',
  name_ko: '이름(한글)',
  name_en: '이름(영문)',
  bio: '작가 소개',
  history: '작가 이력',
  profile_image: '프로필 이미지',
  contact_email: '연락 이메일',
  instagram: '인스타그램',
  homepage: '홈페이지',
};

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function toObjectList(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    );
  }

  const objectValue = toObject(value);
  if (!objectValue) return null;
  if (!Array.isArray(objectValue.items)) return null;

  return objectValue.items.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  );
}

function valueEquals(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function getFieldLabel(key: string) {
  return FIELD_LABELS[key] || key;
}

function getDiffRows(
  beforeObj: Record<string, unknown>,
  afterObj: Record<string, unknown>
): DiffRow[] {
  const keys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

  return keys
    .filter((key) => key !== 'updated_at')
    .filter((key) => !valueEquals(beforeObj[key], afterObj[key]))
    .map((key) => ({
      field: key,
      before: beforeObj[key],
      after: afterObj[key],
    }));
}

function getDiffItems(log: ActivityLogEntry): DiffItem[] {
  const beforeList = toObjectList(log.before_snapshot);
  const afterList = toObjectList(log.after_snapshot);
  const targetNameMap = getTargetNameMap(log);

  if (beforeList && afterList) {
    const beforeMap = new Map(
      beforeList
        .map((item) => {
          const id = typeof item.id === 'string' ? item.id : null;
          return id ? [id, item] : null;
        })
        .filter((entry): entry is [string, Record<string, unknown>] => !!entry)
    );
    const afterMap = new Map(
      afterList
        .map((item) => {
          const id = typeof item.id === 'string' ? item.id : null;
          return id ? [id, item] : null;
        })
        .filter((entry): entry is [string, Record<string, unknown>] => !!entry)
    );

    return Array.from(beforeMap.entries())
      .map(([id, beforeObj]) => {
        const afterObj = afterMap.get(id);
        if (!afterObj) return null;
        const changes = getDiffRows(beforeObj, afterObj);
        if (changes.length === 0) return null;
        return {
          itemId: id,
          itemLabel:
            getSnapshotDisplayName(afterObj) ||
            getSnapshotDisplayName(beforeObj) ||
            targetNameMap.get(id) ||
            null,
          changes,
        };
      })
      .filter((item): item is DiffItem => !!item);
  }

  const beforeObj = toObject(log.before_snapshot);
  const afterObj = toObject(log.after_snapshot);
  if (!beforeObj || !afterObj) return [];

  const changes = getDiffRows(beforeObj, afterObj);
  if (changes.length === 0) return [];

  return [
    {
      itemId: log.target_id,
      itemLabel:
        getSnapshotDisplayName(afterObj) ||
        getSnapshotDisplayName(beforeObj) ||
        targetNameMap.get(log.target_id) ||
        null,
      changes,
    },
  ];
}

function formatDiffValue(value: unknown, field: string): string {
  if (value === null || value === undefined || value === '') return '-';

  if (field === 'status') {
    const statusText = formatStatus(value);
    if (statusText) return statusText;
  }

  if (field.endsWith('_id') && typeof value === 'string') {
    return formatIdentifier(value);
  }

  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => typeof item === 'string')) {
      return `${value.length}개 (${value.slice(0, 2).join(', ')}${value.length > 2 ? '...' : ''})`;
    }
    return `${value.length}개 항목`;
  }
  if (typeof value === 'object') {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  }

  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

export function LogsList({ logs, currentPage, totalPages, total }: LogsListProps) {
  const router = useRouter();
  const toast = useToast();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleRevert = async (logId: string) => {
    const reason = prompt('복구 사유를 입력해주세요.');
    if (!reason || !reason.trim()) return;

    if (!confirm('정말 이 변경을 복구하시겠습니까? 현재 데이터에 영향을 줄 수 있습니다.')) return;

    try {
      await revertActivityLog(logId, reason.trim());
      toast.success('복구가 완료되었습니다.');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : '복구 중 오류가 발생했습니다.';
      toast.error(message);
    }
  };

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
          <p className="mt-1 text-sm text-gray-500">
            관리자/아티스트 활동이 기록되면 여기에 표시됩니다.
          </p>
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
                행위자
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                활동
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                대상
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                조치
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const link = getTargetLink(log);
              const diffItems = getDiffItems(log);
              const totalDiffCount = diffItems.reduce((sum, item) => sum + item.changes.length, 0);
              const canShowDiff = totalDiffCount > 0;
              const isExpanded = expandedLogId === log.id;
              const targetDisplayName = getLogTargetDisplayName(log);

              return (
                <Fragment key={log.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                      {getActorDisplay(log)}
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {getActorRoleLabel(log.actor_role)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{formatActionDescription(log)}</span>
                        {canShowDiff && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            변경 {totalDiffCount}건
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {link ? (
                        <div className="space-y-0.5">
                          <Link href={link} className="text-indigo-600 hover:underline">
                            {getTargetTypeLabel(log.target_type)}
                          </Link>
                          <div className="text-xs text-slate-600">{targetDisplayName}</div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div>{getTargetTypeLabel(log.target_type)}</div>
                          <div className="text-xs text-slate-600">{targetDisplayName}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        {canShowDiff && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {isExpanded ? '변경 닫기' : '변경 보기'}
                          </button>
                        )}
                        {log.reversible && !log.reverted_at ? (
                          <button
                            onClick={() => handleRevert(log.id)}
                            className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                          >
                            복구
                          </button>
                        ) : log.reverted_at ? (
                          <span className="text-xs text-green-700">복구됨</span>
                        ) : (
                          <span
                            className="text-xs text-gray-400"
                            title="복구 대상이 아닌 활동입니다."
                          >
                            복구 불가
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && canShowDiff && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-4 sm:px-6 py-4">
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-slate-700">변경 상세 비교</div>
                          {diffItems.map((item) => (
                            <div
                              key={item.itemId}
                              className="rounded-md border border-slate-200 bg-white"
                            >
                              <div className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
                                대상:{' '}
                                {item.itemLabel ||
                                  `이름 정보 없음 (${formatIdentifier(item.itemId)})`}
                                {item.itemLabel ? (
                                  <span className="ml-2 text-slate-500">
                                    (ID: {formatIdentifier(item.itemId)})
                                  </span>
                                ) : null}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium">변경 내용</th>
                                      <th className="px-3 py-2 text-left font-medium">이전 값</th>
                                      <th className="px-3 py-2 text-left font-medium">변경 값</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.changes.map((change) => (
                                      <tr
                                        key={`${item.itemId}-${change.field}`}
                                        className="border-t border-slate-100"
                                      >
                                        <td className="px-3 py-2 text-slate-700">
                                          {getFieldLabel(change.field)}
                                        </td>
                                        <td className="px-3 py-2 text-rose-700 whitespace-pre-wrap break-all">
                                          {formatDiffValue(change.before, change.field)}
                                        </td>
                                        <td className="px-3 py-2 text-emerald-700 whitespace-pre-wrap break-all">
                                          {formatDiffValue(change.after, change.field)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
