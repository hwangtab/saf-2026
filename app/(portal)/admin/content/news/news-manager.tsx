'use client';

import { createNews, updateNews, deleteNews } from '@/app/actions/admin-content';
import { CRUDManager } from '../_components/CRUDManager';

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

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

export function NewsManager({ news }: { news: NewsItem[] }) {
  return (
    <CRUDManager<NewsItem>
      items={news}
      actions={{
        create: createNews,
        update: updateNews,
        delete: deleteNews,
      }}
      searchFields={(item) => [item.title, item.source]}
      extractOptimisticUpdate={(formData) => ({
        title: formData.get('title') as string,
        source: formData.get('source') as string,
        date: formData.get('date') as string,
        link: formData.get('link') as string,
        thumbnail: formData.get('thumbnail') as string,
        description: formData.get('description') as string,
      })}
      renderCreateForm={() => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="title" required placeholder="제목" className={inputClass} />
            <input name="source" placeholder="출처" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="date" name="date" className={inputClass} />
            <input name="link" placeholder="링크" className={inputClass} />
          </div>
          <input name="thumbnail" placeholder="썸네일 URL" className={inputClass} />
          <textarea name="description" placeholder="설명" rows={3} className={inputClass} />
        </>
      )}
      renderEditForm={(item) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="title"
              required
              defaultValue={item.title}
              placeholder="제목"
              className={inputClass}
            />
            <input
              name="source"
              defaultValue={item.source || ''}
              placeholder="출처"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="date"
              name="date"
              defaultValue={formatDateInput(item.date)}
              className={inputClass}
            />
            <input
              name="link"
              defaultValue={item.link || ''}
              placeholder="링크"
              className={inputClass}
            />
          </div>
          <input
            name="thumbnail"
            defaultValue={item.thumbnail || ''}
            placeholder="썸네일 URL"
            className={inputClass}
          />
          <textarea
            name="description"
            defaultValue={item.description || ''}
            placeholder="설명"
            rows={3}
            className={inputClass}
          />
        </>
      )}
      labels={{
        createTitle: '뉴스 추가',
        createButton: '추가',
        deleteTitle: '뉴스 삭제 확인',
        deleteDescription: '이 뉴스를 삭제하시겠습니까?',
        searchLabel: '뉴스 검색',
        searchPlaceholder: '검색: 제목/출처',
        searchDescription: '뉴스 제목 또는 출처로 검색할 수 있습니다.',
        addedMessage: 'News item added.',
        savedMessage: 'News item saved.',
        deletedMessage: 'News item deleted.',
      }}
    />
  );
}
