'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { createVideo, updateVideo, deleteVideo } from '@/app/actions/admin-content';
import { AdminCard } from '@/app/admin/_components/admin-ui';

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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const handleDelete = async (id: string) => {
    if (!confirm('이 영상을 삭제하시겠습니까?')) return;
    setProcessingId(id);
    try {
      await deleteVideo(id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminCard className="p-6">
        <h2 className="text-lg font-medium text-gray-900">영상 추가</h2>
        <form action={createVideo} className="mt-4 grid grid-cols-1 gap-4">
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
            <Button type="submit" variant="primary">
              추가
            </Button>
          </div>
        </form>
      </AdminCard>

      <section className="space-y-4">
        <AdminCard className="p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 제목/유튜브 ID"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </AdminCard>
        {videos
          .filter((item) => {
            if (!query) return true;
            const q = normalize(query);
            return normalize(item.title).includes(q) || normalize(item.youtube_id).includes(q);
          })
          .map((item) => (
            <form
              key={item.id}
              action={updateVideo.bind(null, item.id)}
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
