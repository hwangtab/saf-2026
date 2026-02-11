'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { createVideo, updateVideo, deleteVideo } from '@/app/actions/admin-content';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';

type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  thumbnail: string | null;
  transcript: string | null;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');

export function VideosManager({ videos }: { videos: VideoItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [optimisticVideos, setOptimisticVideos] = useState(videos);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setOptimisticVideos(videos);
  }, [videos]);

  const handleCreate = async (formData: FormData) => {
    setCreating(true);
    try {
      await createVideo(formData);
      toast.success('영상을 추가했습니다.');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '추가 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    const previousVideos = [...optimisticVideos];

    const title = formData.get('title') as string;
    const youtube_id = formData.get('youtube_id') as string;
    const description = formData.get('description') as string;
    const thumbnail = formData.get('thumbnail') as string;
    const transcript = formData.get('transcript') as string;

    setOptimisticVideos((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              title,
              youtube_id,
              description,
              thumbnail,
              transcript,
            }
          : v
      )
    );
    setSavingId(id);

    try {
      await updateVideo(id, formData);
      toast.success('영상을 저장했습니다.');
    } catch (err: unknown) {
      setOptimisticVideos(previousVideos);
      toast.error(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 영상을 삭제하시겠습니까?')) return;

    const previousVideos = [...optimisticVideos];
    setOptimisticVideos((prev) => prev.filter((v) => v.id !== id));
    setProcessingId(id);

    try {
      await deleteVideo(id);
      toast.success('영상을 삭제했습니다.');
    } catch (err: unknown) {
      console.error('삭제 중 오류:', err);
      setOptimisticVideos(previousVideos);
      toast.error(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminCard className="p-6">
        <h2 className="text-lg font-medium text-gray-900">영상 추가</h2>
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
              name="youtube_id"
              required
              placeholder="유튜브 ID"
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
          <textarea
            name="transcript"
            placeholder="자막/요약"
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={creating} disabled={creating}>
              추가
            </Button>
          </div>
        </form>
      </AdminCard>

      <section className="space-y-4">
        <AdminCard className="p-4">
          <label htmlFor="search-videos" className="sr-only">
            영상 검색
          </label>
          <input
            id="search-videos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 제목/유튜브 ID"
            aria-describedby="search-videos-description"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <span id="search-videos-description" className="sr-only">
            영상 제목 또는 유튜브 ID로 검색할 수 있습니다.
          </span>
        </AdminCard>
        {optimisticVideos
          .filter((item) => {
            if (!query) return true;
            const q = normalize(query);
            return normalize(item.title).includes(q) || normalize(item.youtube_id).includes(q);
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
                  onClick={() => handleDelete(item.id)}
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
                  name="youtube_id"
                  required
                  defaultValue={item.youtube_id}
                  placeholder="유튜브 ID"
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
              <textarea
                name="transcript"
                defaultValue={item.transcript || ''}
                placeholder="자막/요약"
                rows={4}
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
