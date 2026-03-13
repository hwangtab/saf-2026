'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
  AdminSelect,
} from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';
import { updateFeedbackStatus } from '@/app/actions/feedback';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '@/types';
import clsx from 'clsx';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

const CATEGORY_LABELS_BY_LOCALE: Record<LocaleCode, Record<FeedbackCategory, string>> = {
  ko: {
    bug: '버그',
    improvement: '개선',
    question: '질문',
    other: '기타',
  },
  en: {
    bug: 'Bug',
    improvement: 'Improvement',
    question: 'Question',
    other: 'Other',
  },
};

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  bug: 'bg-red-100 text-red-700',
  improvement: 'bg-blue-100 text-blue-700',
  question: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS_BY_LOCALE: Record<LocaleCode, Record<FeedbackStatus, string>> = {
  ko: {
    open: '접수',
    reviewing: '검토 중',
    resolved: '해결',
    closed: '닫힘',
  },
  en: {
    open: 'Open',
    reviewing: 'Reviewing',
    resolved: 'Resolved',
    closed: 'Closed',
  },
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-500',
};

const FEEDBACK_COPY: Record<
  LocaleCode,
  {
    statusUpdated: string;
    statusUpdateError: string;
    memoSaved: string;
    memoSaveError: string;
    pageTitle: string;
    pageDescription: string;
    statusFilterAria: string;
    allStatuses: string;
    categoryFilterAria: string;
    allCategories: string;
    count: (count: number) => string;
    emptyTitle: string;
    emptyDescription: string;
    close: string;
    adminMemo: string;
    adminMemoPlaceholder: string;
    saveMemo: string;
  }
> = {
  ko: {
    statusUpdated: '상태를 변경했습니다.',
    statusUpdateError: '상태 변경 중 오류가 발생했습니다.',
    memoSaved: '메모를 저장했습니다.',
    memoSaveError: '메모 저장 중 오류가 발생했습니다.',
    pageTitle: '피드백 관리',
    pageDescription: '사용자들이 보낸 버그 신고, 개선 요청, 질문 등을 확인하고 관리합니다.',
    statusFilterAria: '상태 필터',
    allStatuses: '전체 상태',
    categoryFilterAria: '카테고리 필터',
    allCategories: '전체 카테고리',
    count: (count: number) => `${count}건`,
    emptyTitle: '피드백이 없습니다',
    emptyDescription: '조건에 맞는 피드백이 없습니다.',
    close: '닫기',
    adminMemo: '관리자 메모',
    adminMemoPlaceholder: '내부 메모를 남겨주세요 (사용자에게 표시되지 않음)',
    saveMemo: '메모 저장',
  },
  en: {
    statusUpdated: 'Status updated.',
    statusUpdateError: 'An error occurred while changing status.',
    memoSaved: 'Memo saved.',
    memoSaveError: 'An error occurred while saving memo.',
    pageTitle: 'Feedback management',
    pageDescription:
      'Review and manage bug reports, improvement requests, and questions submitted by users.',
    statusFilterAria: 'Status filter',
    allStatuses: 'All statuses',
    categoryFilterAria: 'Category filter',
    allCategories: 'All categories',
    count: (count: number) => `${count}`,
    emptyTitle: 'No feedback',
    emptyDescription: 'No feedback matches the selected conditions.',
    close: 'Close',
    adminMemo: 'Admin memo',
    adminMemoPlaceholder: 'Leave an internal memo (not visible to users)',
    saveMemo: 'Save memo',
  },
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {children}
    </span>
  );
}

export function FeedbackManager({ feedback: initialFeedback }: { feedback: Feedback[] }) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = FEEDBACK_COPY[locale];
  const categoryLabels = CATEGORY_LABELS_BY_LOCALE[locale];
  const statusLabels = STATUS_LABELS_BY_LOCALE[locale];
  const router = useRouter();
  const toast = useToast();
  const [localFeedback, setLocalFeedback] = useState(initialFeedback);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = localFeedback.find((f) => f.id === selectedId);

  const filtered = localFeedback.filter((f) => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    return true;
  });

  const handleSelect = (f: Feedback) => {
    setSelectedId(f.id);
    setAdminNote(f.admin_note || '');
  };

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const result = await updateFeedbackStatus(selectedId, newStatus, adminNote);
      if (result.error) {
        toast.error(result.error);
      } else {
        setLocalFeedback((prev) =>
          prev.map((f) =>
            f.id === selectedId
              ? {
                  ...f,
                  status: newStatus,
                  admin_note: adminNote.trim() || null,
                  resolved_at:
                    newStatus === 'resolved' || newStatus === 'closed'
                      ? new Date().toISOString()
                      : null,
                }
              : f
          )
        );
        toast.success(copy.statusUpdated);
        router.refresh();
      }
    } catch {
      toast.error(copy.statusUpdateError);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedId || !selected) return;
    setSaving(true);
    try {
      const result = await updateFeedbackStatus(selectedId, selected.status, adminNote);
      if (result.error) {
        toast.error(result.error);
      } else {
        setLocalFeedback((prev) =>
          prev.map((f) =>
            f.id === selectedId ? { ...f, admin_note: adminNote.trim() || null } : f
          )
        );
        toast.success(copy.memoSaved);
        router.refresh();
      }
    } catch {
      toast.error(copy.memoSaveError);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{copy.pageTitle}</AdminPageTitle>
        <AdminPageDescription>{copy.pageDescription}</AdminPageDescription>
      </AdminPageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <AdminSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'all')}
          aria-label={copy.statusFilterAria}
        >
          <option value="all">{copy.allStatuses}</option>
          {(Object.entries(statusLabels) as [FeedbackStatus, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FeedbackCategory | 'all')}
          aria-label={copy.categoryFilterAria}
        >
          <option value="all">{copy.allCategories}</option>
          {(Object.entries(categoryLabels) as [FeedbackCategory, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </AdminSelect>
        <span className="ml-auto text-sm text-slate-500">{copy.count(filtered.length)}</span>
      </div>

      {/* List */}
      <AdminCard>
        {filtered.length === 0 ? (
          <AdminEmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
        ) : (
          <ul className="divide-y divide-[var(--admin-border-soft)]">
            {filtered.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(f)}
                  className={clsx(
                    'w-full px-4 py-3 text-left transition-colors hover:bg-slate-50',
                    selectedId === f.id && 'bg-indigo-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge className={CATEGORY_COLORS[f.category]}>
                      {categoryLabels[f.category]}
                    </Badge>
                    <Badge className={STATUS_COLORS[f.status]}>{statusLabels[f.status]}</Badge>
                    <span className="flex-1 truncate text-sm font-medium text-slate-900">
                      {f.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDate(f.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {f.user_email}
                    {f.page_url && <span className="ml-2 text-slate-400">{f.page_url}</span>}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {/* Detail Panel */}
      {selected && (
        <AdminCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={CATEGORY_COLORS[selected.category]}>
                    {categoryLabels[selected.category]}
                  </Badge>
                  <Badge className={STATUS_COLORS[selected.status]}>
                    {statusLabels[selected.status]}
                  </Badge>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{selected.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selected.user_email} · {formatDate(selected.created_at)}
                  {selected.page_url && (
                    <span className="ml-2 text-slate-400">({selected.page_url})</span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedId(null)}
                className="shrink-0"
              >
                {copy.close}
              </Button>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm text-slate-700">{selected.description}</p>
            </div>

            <div>
              <label
                htmlFor="admin-note"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {copy.adminMemo}
              </label>
              <textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder={copy.adminMemoPlaceholder}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              <div className="mt-1.5 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving || adminNote === (selected.admin_note || '')}
                  onClick={handleSaveNote}
                >
                  {copy.saveMemo}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.entries(statusLabels) as [FeedbackStatus, string][]).map(
                ([status, label]) => (
                  <Button
                    key={status}
                    variant={selected.status === status ? 'primary' : 'secondary'}
                    size="sm"
                    disabled={saving || selected.status === status}
                    onClick={() => handleStatusChange(status)}
                  >
                    {label}
                  </Button>
                )
              )}
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
