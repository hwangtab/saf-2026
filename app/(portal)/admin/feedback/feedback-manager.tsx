'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
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

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  bug: 'bg-red-100 text-red-700',
  improvement: 'bg-blue-100 text-blue-700',
  question: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-500',
};

const CATEGORY_KEYS: Record<FeedbackCategory, string> = {
  bug: 'categoryBug',
  improvement: 'categoryImprovement',
  question: 'categoryQuestion',
  other: 'categoryOther',
};

const STATUS_KEYS: Record<FeedbackStatus, string> = {
  open: 'statusOpen',
  reviewing: 'statusReviewing',
  resolved: 'statusResolved',
  closed: 'statusClosed',
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
  const locale = useLocale();
  const t = useTranslations('admin.feedback');
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
        toast.success(t('statusUpdated'));
        router.refresh();
      }
    } catch (error) {
      console.error('[admin-feedback-manager] Feedback status update failed:', error);
      toast.error(t('statusUpdateError'));
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
        toast.success(t('memoSaved'));
        router.refresh();
      }
    } catch (error) {
      console.error('[admin-feedback-manager] Feedback memo save failed:', error);
      toast.error(t('memoSaveError'));
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

  const getCategoryLabel = (cat: FeedbackCategory) => t(CATEGORY_KEYS[cat]);
  const getStatusLabel = (status: FeedbackStatus) => t(STATUS_KEYS[status]);

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{t('pageTitle')}</AdminPageTitle>
        <AdminPageDescription>{t('pageDescription')}</AdminPageDescription>
      </AdminPageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <AdminSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'all')}
          aria-label={t('statusFilterAria')}
        >
          <option value="all">{t('allStatuses')}</option>
          {(Object.keys(STATUS_KEYS) as FeedbackStatus[]).map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FeedbackCategory | 'all')}
          aria-label={t('categoryFilterAria')}
        >
          <option value="all">{t('allCategories')}</option>
          {(Object.keys(CATEGORY_KEYS) as FeedbackCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </AdminSelect>
        <span className="ml-auto text-sm text-slate-500">
          {t('count', { count: filtered.length })}
        </span>
      </div>

      {/* List */}
      <AdminCard>
        {filtered.length === 0 ? (
          <AdminEmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
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
                      {getCategoryLabel(f.category)}
                    </Badge>
                    <Badge className={STATUS_COLORS[f.status]}>{getStatusLabel(f.status)}</Badge>
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
                    {getCategoryLabel(selected.category)}
                  </Badge>
                  <Badge className={STATUS_COLORS[selected.status]}>
                    {getStatusLabel(selected.status)}
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
                {t('close')}
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
                {t('adminMemo')}
              </label>
              <textarea
                id="admin-note"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder={t('adminMemoPlaceholder')}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-nonefocus-visible:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900"
              />
              <div className="mt-1.5 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saving || adminNote === (selected.admin_note || '')}
                  onClick={handleSaveNote}
                >
                  {t('saveMemo')}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_KEYS) as FeedbackStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={selected.status === status ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={saving || selected.status === status}
                  onClick={() => handleStatusChange(status)}
                >
                  {getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
