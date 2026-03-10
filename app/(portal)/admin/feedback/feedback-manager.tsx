'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  AdminCard,
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';
import { updateFeedbackStatus } from '@/app/actions/feedback';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '@/types';
import clsx from 'clsx';

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: '버그',
  improvement: '개선',
  question: '질문',
  other: '기타',
};

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  bug: 'bg-red-100 text-red-700',
  improvement: 'bg-blue-100 text-blue-700',
  question: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: '접수',
  reviewing: '검토 중',
  resolved: '해결',
  closed: '닫힘',
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-500',
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

export function FeedbackManager({ feedback }: { feedback: Feedback[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = feedback.find((f) => f.id === selectedId);

  const filtered = feedback.filter((f) => {
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
        toast.success('상태가 변경되었습니다.');
        setSelectedId(null);
        router.refresh();
      }
    } catch {
      toast.error('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>피드백 관리</AdminPageTitle>
        <AdminPageDescription>
          사용자들이 보낸 버그 신고, 개선 요청, 질문 등을 확인하고 관리합니다.
        </AdminPageDescription>
      </AdminPageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'all')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          aria-label="상태 필터"
        >
          <option value="all">전체 상태</option>
          {(Object.entries(STATUS_LABELS) as [FeedbackStatus, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FeedbackCategory | 'all')}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          aria-label="카테고리 필터"
        >
          <option value="all">전체 카테고리</option>
          {(Object.entries(CATEGORY_LABELS) as [FeedbackCategory, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-slate-500">{filtered.length}건</span>
      </div>

      {/* List */}
      <AdminCard>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">피드백이 없습니다.</p>
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
                      {CATEGORY_LABELS[f.category]}
                    </Badge>
                    <Badge className={STATUS_COLORS[f.status]}>{STATUS_LABELS[f.status]}</Badge>
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
                    {CATEGORY_LABELS[selected.category]}
                  </Badge>
                  <Badge className={STATUS_COLORS[selected.status]}>
                    {STATUS_LABELS[selected.status]}
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
                닫기
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
                관리자 메모
              </label>
              <textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder="내부 메모를 남겨주세요 (사용자에게 표시되지 않음)"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_LABELS) as [FeedbackStatus, string][]).map(
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
