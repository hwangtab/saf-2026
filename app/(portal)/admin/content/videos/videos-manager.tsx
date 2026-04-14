'use client';

import { createVideo, updateVideo, deleteVideo } from '@/app/actions/admin-content';
import { AdminInput, AdminTextarea } from '@/app/admin/_components/admin-ui';
import { CRUDManager } from '../_components/CRUDManager';

type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  thumbnail: string | null;
  transcript: string | null;
};

export function VideosManager({ videos }: { videos: VideoItem[] }) {
  return (
    <CRUDManager<VideoItem>
      items={videos}
      actions={{
        create: createVideo,
        update: updateVideo,
        delete: deleteVideo,
      }}
      searchFields={(item) => [item.title, item.youtube_id]}
      extractOptimisticUpdate={(formData) => ({
        title: formData.get('title') as string,
        youtube_id: formData.get('youtube_id') as string,
        description: formData.get('description') as string,
        thumbnail: formData.get('thumbnail') as string,
        transcript: formData.get('transcript') as string,
      })}
      renderCreateForm={() => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput name="title" required placeholder="제목" />
            <AdminInput name="youtube_id" required placeholder="유튜브 ID" />
          </div>
          <AdminInput name="thumbnail" placeholder="썸네일 URL" />
          <AdminTextarea name="description" placeholder="설명" rows={3} />
          <AdminTextarea name="transcript" placeholder="자막/요약" rows={4} />
        </>
      )}
      renderEditForm={(item) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput name="title" required defaultValue={item.title} placeholder="제목" />
            <AdminInput
              name="youtube_id"
              required
              defaultValue={item.youtube_id}
              placeholder="유튜브 ID"
            />
          </div>
          <AdminInput
            name="thumbnail"
            defaultValue={item.thumbnail || ''}
            placeholder="썸네일 URL"
          />
          <AdminTextarea
            name="description"
            defaultValue={item.description || ''}
            placeholder="설명"
            rows={3}
          />
          <AdminTextarea
            name="transcript"
            defaultValue={item.transcript || ''}
            placeholder="자막/요약"
            rows={4}
          />
        </>
      )}
      labels={{
        createTitle: '영상 추가',
        createButton: '추가',
        deleteTitle: '영상 삭제 확인',
        deleteDescription: '이 영상을 삭제하시겠습니까?',
        searchLabel: '영상 검색',
        searchPlaceholder: '검색: 제목/유튜브 ID',
        searchDescription: '영상 제목 또는 유튜브 ID로 검색할 수 있습니다.',
        addedMessage: 'Video added.',
        savedMessage: 'Video saved.',
        deletedMessage: 'Video deleted.',
      }}
    />
  );
}
