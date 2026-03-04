'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { createFaq, updateFaq, deleteFaq } from '@/app/actions/admin-content';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { matchesAnySearch } from '@/lib/search-utils';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  display_order: number | null;
};

export function FaqManager({ faqs }: { faqs: FaqItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [optimisticFaqs, setOptimisticFaqs] = useState(faqs);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticFaqs(faqs);
  }, [faqs]);

  const handleCreate = async (formData: FormData) => {
    setCreating(true);
    try {
      await createFaq(formData);
      toast.success('FAQ를 추가했습니다.');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '추가 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    const originalFaqs = [...optimisticFaqs];
    const question = formData.get('question') as string;
    const answer = formData.get('answer') as string;
    const displayOrder = Number(formData.get('display_order'));

    setOptimisticFaqs((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, question, answer, display_order: displayOrder } : item
      )
    );
    setSavingId(id);
    try {
      await updateFaq(id, formData);
      toast.success('FAQ를 저장했습니다.');
    } catch (err: unknown) {
      setOptimisticFaqs(originalFaqs);
      toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    const originalFaqs = [...optimisticFaqs];
    setOptimisticFaqs((prev) => prev.filter((item) => item.id !== id));
    setProcessingId(id);
    try {
      await deleteFaq(id);
      toast.success('FAQ를 삭제했습니다.');
    } catch (err: unknown) {
      setOptimisticFaqs(originalFaqs);
      console.error('삭제 중 오류:', err);
      toast.error(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminCard className="p-6">
        <h2 className="text-lg font-medium text-gray-900">FAQ 추가</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate(new FormData(e.currentTarget));
          }}
          className="mt-4 grid grid-cols-1 gap-4"
        >
          <input
            name="question"
            required
            placeholder="질문"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            name="answer"
            required
            rows={4}
            placeholder="답변"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="display_order"
            placeholder="노출 순서 (숫자)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={creating} disabled={creating}>
              추가
            </Button>
          </div>
        </form>
      </AdminCard>

      <AdminConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="FAQ 삭제 확인"
        description="이 FAQ를 삭제하시겠습니까?"
        confirmText="삭제하기"
        variant="danger"
      />

      <section className="space-y-4">
        <AdminCard className="p-4">
          <label htmlFor="search-faqs" className="sr-only">
            FAQ 검색
          </label>
          <input
            id="search-faqs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 질문/답변"
            aria-describedby="search-faqs-description"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <span id="search-faqs-description" className="sr-only">
            FAQ 질문 또는 답변으로 검색할 수 있습니다.
          </span>
        </AdminCard>
        {optimisticFaqs
          .filter((item) => {
            if (!query.trim()) return true;
            return matchesAnySearch(query, [item.question, item.answer]);
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
              <input
                name="question"
                required
                defaultValue={item.question}
                placeholder="질문"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                name="answer"
                required
                rows={4}
                defaultValue={item.answer}
                placeholder="답변"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                name="display_order"
                defaultValue={item.display_order ?? 0}
                placeholder="노출 순서 (숫자)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
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
