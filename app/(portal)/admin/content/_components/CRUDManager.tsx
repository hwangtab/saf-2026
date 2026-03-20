'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { matchesAnySearch } from '@/lib/search-utils';

interface CRUDManagerProps<T extends { id: string }> {
  items: T[];
  actions: {
    create: (formData: FormData) => Promise<unknown>;
    update: (id: string, formData: FormData) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
  };
  searchFields: (item: T) => (string | null | undefined)[];
  extractOptimisticUpdate?: (formData: FormData) => Partial<T>;
  renderCreateForm: () => React.ReactNode;
  renderEditForm: (item: T) => React.ReactNode;
  labels: {
    createTitle: string;
    createButton: string;
    deleteTitle: string;
    deleteDescription: string;
    searchLabel: string;
    searchPlaceholder: string;
    searchDescription: string;
    addedMessage: string;
    savedMessage: string;
    deletedMessage: string;
  };
}

export function CRUDManager<T extends { id: string }>({
  items,
  actions,
  searchFields,
  extractOptimisticUpdate,
  renderCreateForm,
  renderEditForm,
  labels,
}: CRUDManagerProps<T>) {
  const router = useRouter();
  const toast = useToast();
  const [optimisticItems, setOptimisticItems] = useState(items);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticItems(items);
  }, [items]);

  const handleCreate = async (formData: FormData) => {
    setCreating(true);
    try {
      await actions.create(formData);
      toast.success(labels.addedMessage);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '추가 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    const previous = [...optimisticItems];

    if (extractOptimisticUpdate) {
      const updates = extractOptimisticUpdate(formData);
      setOptimisticItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    }
    setSavingId(id);

    try {
      await actions.update(id, formData);
      toast.success(labels.savedMessage);
    } catch (err: unknown) {
      setOptimisticItems(previous);
      toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);

    const previous = [...optimisticItems];
    setOptimisticItems((prev) => prev.filter((item) => item.id !== id));
    setProcessingId(id);

    try {
      await actions.delete(id);
      toast.success(labels.deletedMessage);
    } catch (err: unknown) {
      console.error('삭제 중 오류:', err);
      setOptimisticItems(previous);
      toast.error(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const searchId = `search-${labels.createTitle.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="space-y-8">
      <AdminCard className="p-6">
        <h2 className="text-lg font-medium text-gray-900">{labels.createTitle}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate(new FormData(e.currentTarget));
          }}
          className="mt-4 grid grid-cols-1 gap-4"
        >
          {renderCreateForm()}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={creating} disabled={creating}>
              {labels.createButton}
            </Button>
          </div>
        </form>
      </AdminCard>

      <AdminConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title={labels.deleteTitle}
        description={labels.deleteDescription}
        confirmText="삭제하기"
        variant="danger"
      />

      <section className="space-y-4">
        <AdminCard className="p-4">
          <label htmlFor={searchId} className="sr-only">
            {labels.searchLabel}
          </label>
          <input
            id={searchId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-describedby={`${searchId}-description`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <span id={`${searchId}-description`} className="sr-only">
            {labels.searchDescription}
          </span>
        </AdminCard>
        {optimisticItems
          .filter((item) => {
            if (!query.trim()) return true;
            return matchesAnySearch(query, searchFields(item));
          })
          .map((item) => (
            <form
              key={item.id}
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpdate(item.id, new FormData(e.currentTarget));
              }}
              className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-500 break-all">ID: {item.id}</div>
                <Button
                  type="button"
                  variant="white"
                  className="text-red-600"
                  onClick={() => setDeleteTargetId(item.id)}
                  loading={processingId === item.id}
                  disabled={processingId !== null || creating || savingId !== null}
                >
                  삭제
                </Button>
              </div>
              {renderEditForm(item)}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={savingId === item.id}
                  disabled={creating || savingId !== null || processingId !== null}
                >
                  저장
                </Button>
              </div>
            </form>
          ))}
      </section>
    </div>
  );
}
