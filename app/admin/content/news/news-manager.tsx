'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { createNews, updateNews, deleteNews } from '@/app/actions/admin-content';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';

type NewsItem = {
  id: string;
  title: string;
  source: string | null;
  date: string | null;
  link: string | null;
  thumbnail: string | null;
  description: string | null;
};

const formatDateInput = (value: string | null) => {
  if (!value) return '';
  return value.toString().slice(0, 10);
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');

export function NewsManager({ news }: { news: NewsItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [optimisticNews, setOptimisticNews] = useState(news);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticNews(news);
  }, [news]);

  const handleCreate = async (formData: FormData) => {
    setCreating(true);
    try {
      await createNews(formData);
      toast.success('뉴스를 추가했습니다.');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '추가 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    const previousNews = [...optimisticNews];

    const title = formData.get('title') as string;
    const source = formData.get('source') as string;
    const date = formData.get('date') as string;
    const link = formData.get('link') as string;
    const thumbnail = formData.get('thumbnail') as string;
    const description = formData.get('description') as string;

    setOptimisticNews((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              title,
              source,
              date,
              link,
              thumbnail,
              description,
            }
          : n
      )
    );
    setSavingId(id);

    try {
      await updateNews(id, formData);
      toast.success('뉴스를 저장했습니다.');
    } catch (err: unknown) {
      setOptimisticNews(previousNews);
      toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);

    const previousNews = [...optimisticNews];
    setOptimisticNews((prev) => prev.filter((n) => n.id !== id));
    setProcessingId(id);

    try {
      await deleteNews(id);
      toast.success('뉴스를 삭제했습니다.');
    } catch (err: unknown) {
      console.error('삭제 중 오류:', err);
      setOptimisticNews(previousNews);
      toast.error(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminCard className="p-6">
        <h2 className="text-lg font-medium text-gray-900">뉴스 추가</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate(new FormData(e.currentTarget));
          }}
          className="mt-4 grid grid-cols-1 gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="title"
              required
              placeholder="제목"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              name="source"
              placeholder="출처"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="date"
              name="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              name="link"
              placeholder="링크"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            name="thumbnail"
            placeholder="썸네일 URL"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            placeholder="설명"
            rows={3}
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
        title="뉴스 삭제 확인"
        description="이 뉴스를 삭제하시겠습니까?"
        confirmText="삭제하기"
        variant="danger"
      />

      <section className="space-y-4">
        <AdminCard className="p-4">
          <label htmlFor="search-news" className="sr-only">
            뉴스 검색
          </label>
          <input
            id="search-news"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 제목/출처"
            aria-describedby="search-news-description"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <span id="search-news-description" className="sr-only">
            뉴스 제목 또는 출처로 검색할 수 있습니다.
          </span>
        </AdminCard>
        {optimisticNews
          .filter((item) => {
            if (!query) return true;
            const q = normalize(query);
            return normalize(item.title).includes(q) || normalize(item.source || '').includes(q);
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
                <input
                  name="title"
                  required
                  defaultValue={item.title}
                  placeholder="제목"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  name="source"
                  defaultValue={item.source || ''}
                  placeholder="출처"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="date"
                  name="date"
                  defaultValue={formatDateInput(item.date)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  name="link"
                  defaultValue={item.link || ''}
                  placeholder="링크"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <input
                name="thumbnail"
                defaultValue={item.thumbnail || ''}
                placeholder="썸네일 URL"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                defaultValue={item.description || ''}
                placeholder="설명"
                rows={3}
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
