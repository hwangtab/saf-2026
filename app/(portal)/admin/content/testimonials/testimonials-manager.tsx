'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '@/app/actions/admin-content';
import { AdminCard, AdminInput, AdminTextarea } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { matchesAnySearch } from '@/lib/search-utils';

type TestimonialItem = {
  id: string;
  category: string;
  quote: string;
  author: string;
  context: string | null;
  display_order: number | null;
};

export function TestimonialsManager({ testimonials }: { testimonials: TestimonialItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [optimisticTestimonials, setOptimisticTestimonials] = useState(testimonials);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticTestimonials(testimonials);
  }, [testimonials]);

  const handleCreate = async (formData: FormData) => {
    setCreating(true);
    try {
      await createTestimonial(formData);
      toast.success('추천사를 추가했습니다.');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '추가 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    const originalTestimonials = [...optimisticTestimonials];
    const category = formData.get('category') as string;
    const author = formData.get('author') as string;
    const quote = formData.get('quote') as string;
    const context = formData.get('context') as string;
    const displayOrder = Number(formData.get('display_order'));

    setOptimisticTestimonials((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, category, author, quote, context, display_order: displayOrder }
          : item
      )
    );
    setSavingId(id);
    try {
      await updateTestimonial(id, formData);
      toast.success('추천사를 저장했습니다.');
    } catch (err: unknown) {
      setOptimisticTestimonials(originalTestimonials);
      toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    const originalTestimonials = [...optimisticTestimonials];
    setOptimisticTestimonials((prev) => prev.filter((item) => item.id !== id));
    setProcessingId(id);
    try {
      await deleteTestimonial(id);
      toast.success('추천사를 삭제했습니다.');
    } catch (err: unknown) {
      setOptimisticTestimonials(originalTestimonials);
      console.error('삭제 중 오류:', err);
      toast.error(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminCard className="p-6">
        <h2 className="text-lg font-medium text-gray-900">추천사 추가</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate(new FormData(e.currentTarget));
          }}
          className="mt-4 grid grid-cols-1 gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput name="category" required placeholder="카테고리" />
            <AdminInput name="author" required placeholder="작성자" />
          </div>
          <AdminTextarea name="quote" required rows={3} placeholder="추천사 내용" />
          <AdminInput name="context" placeholder="컨텍스트 (선택)" />
          <AdminInput type="number" name="display_order" placeholder="노출 순서 (숫자)" />
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
        title="추천사 삭제 확인"
        description="이 추천사를 삭제하시겠습니까?"
        confirmText="삭제하기"
        variant="danger"
      />

      <section className="space-y-4">
        <AdminCard className="p-4">
          <label htmlFor="search-testimonials" className="sr-only">
            추천사 검색
          </label>
          <AdminInput
            id="search-testimonials"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 카테고리/작성자/내용"
            aria-describedby="search-testimonials-description"
          />
          <span id="search-testimonials-description" className="sr-only">
            추천사 카테고리, 작성자 또는 내용으로 검색할 수 있습니다.
          </span>
        </AdminCard>
        {optimisticTestimonials
          .filter((item) => {
            if (!query.trim()) return true;
            return matchesAnySearch(query, [item.category, item.author, item.quote]);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminInput
                  name="category"
                  required
                  defaultValue={item.category}
                  placeholder="카테고리"
                />
                <AdminInput
                  name="author"
                  required
                  defaultValue={item.author}
                  placeholder="작성자"
                />
              </div>
              <AdminTextarea
                name="quote"
                required
                rows={3}
                defaultValue={item.quote}
                placeholder="추천사 내용"
              />
              <AdminInput
                name="context"
                defaultValue={item.context || ''}
                placeholder="컨텍스트 (선택)"
              />
              <AdminInput
                type="number"
                name="display_order"
                defaultValue={item.display_order ?? 0}
                placeholder="노출 순서 (숫자)"
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
