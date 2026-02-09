'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { createFaq, updateFaq, deleteFaq } from '@/app/actions/admin-content';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  display_order: number | null;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');

export function FaqManager({ faqs }: { faqs: FaqItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const handleDelete = async (id: string) => {
    if (!confirm('이 FAQ를 삭제하시겠습니까?')) return;
    setProcessingId(id);
    try {
      await deleteFaq(id);
      toast.success('FAQ를 삭제했습니다.');
      router.refresh();
    } catch (err: unknown) {
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
        <form action={createFaq} className="mt-4 grid grid-cols-1 gap-4">
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
            <Button type="submit" variant="primary">
              추가
            </Button>
          </div>
        </form>
      </AdminCard>

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
        {faqs
          .filter((item) => {
            if (!query) return true;
            const q = normalize(query);
            return normalize(item.question).includes(q) || normalize(item.answer).includes(q);
          })
          .map((item) => (
            <form
              key={item.id}
              action={updateFaq.bind(null, item.id)}
              className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-gray-500 break-all">ID: {item.id}</div>
                <Button
                  type="button"
                  variant="white"
                  className="text-red-600"
                  onClick={() => handleDelete(item.id)}
                  loading={processingId === item.id}
                  disabled={processingId !== null}
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
                <Button type="submit" variant="secondary">
                  저장
                </Button>
              </div>
            </form>
          ))}
      </section>
    </div>
  );
}
