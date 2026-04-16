'use client';

import { createStory, updateStory, deleteStory } from '@/app/actions/admin-content';
import { CRUDManager } from '../_components/CRUDManager';

type StoryItem = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  category: string;
  excerpt: string | null;
  excerpt_en: string | null;
  body: string;
  body_en: string | null;
  thumbnail: string | null;
  author: string | null;
  published_at: string | null;
  is_published: boolean | null;
  display_order: number | null;
};

const CATEGORY_OPTIONS = [
  { value: 'artist-story', label: '작가를 만나다' },
  { value: 'buying-guide', label: '컬렉팅 시작하기' },
  { value: 'art-knowledge', label: '미술 산책' },
];

const formatDateInput = (value: string | null) => {
  if (!value) return '';
  return value.toString().slice(0, 10);
};

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

export function StoriesManager({ stories }: { stories: StoryItem[] }) {
  return (
    <CRUDManager<StoryItem>
      items={stories}
      actions={{
        create: createStory,
        update: updateStory,
        delete: deleteStory,
      }}
      searchFields={(item) => [item.title, item.slug, item.author]}
      extractOptimisticUpdate={(formData) => ({
        title: formData.get('title') as string,
        slug: formData.get('slug') as string,
        title_en: formData.get('title_en') as string,
        category: formData.get('category') as string,
        excerpt: formData.get('excerpt') as string,
        excerpt_en: formData.get('excerpt_en') as string,
        body: formData.get('body') as string,
        body_en: formData.get('body_en') as string,
        thumbnail: formData.get('thumbnail') as string,
        author: formData.get('author') as string,
        published_at: formData.get('published_at') as string,
        is_published: formData.get('is_published') === 'on',
        display_order: Number(formData.get('display_order')) || 0,
      })}
      renderCreateForm={() => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="title" required placeholder="제목 (한국어)" className={inputClass} />
            <input
              name="slug"
              required
              placeholder="URL 슬러그 (영문-소문자-하이픈)"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="title_en" placeholder="제목 (영어, 선택)" className={inputClass} />
            <select name="category" className={inputClass}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <textarea name="excerpt" placeholder="요약 (한국어)" rows={2} className={inputClass} />
          <textarea
            name="excerpt_en"
            placeholder="요약 (영어, 선택)"
            rows={2}
            className={inputClass}
          />
          <textarea
            name="body"
            required
            placeholder="본문 (Markdown)"
            rows={10}
            className={inputClass}
          />
          <textarea
            name="body_en"
            placeholder="본문 영어 (Markdown, 선택)"
            rows={6}
            className={inputClass}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="thumbnail" placeholder="썸네일 URL" className={inputClass} />
            <input name="author" placeholder="작성자" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input type="date" name="published_at" className={inputClass} />
            <input
              type="number"
              name="display_order"
              placeholder="정렬 순서"
              defaultValue={0}
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_published" />
              공개 여부
            </label>
          </div>
        </>
      )}
      renderEditForm={(item) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="title"
              required
              defaultValue={item.title}
              placeholder="제목 (한국어)"
              className={inputClass}
            />
            <input
              name="slug"
              required
              defaultValue={item.slug}
              placeholder="URL 슬러그"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="title_en"
              defaultValue={item.title_en || ''}
              placeholder="제목 (영어, 선택)"
              className={inputClass}
            />
            <select name="category" defaultValue={item.category} className={inputClass}>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="excerpt"
            defaultValue={item.excerpt || ''}
            placeholder="요약 (한국어)"
            rows={2}
            className={inputClass}
          />
          <textarea
            name="excerpt_en"
            defaultValue={item.excerpt_en || ''}
            placeholder="요약 (영어, 선택)"
            rows={2}
            className={inputClass}
          />
          <textarea
            name="body"
            required
            defaultValue={item.body}
            placeholder="본문 (Markdown)"
            rows={10}
            className={inputClass}
          />
          <textarea
            name="body_en"
            defaultValue={item.body_en || ''}
            placeholder="본문 영어 (Markdown, 선택)"
            rows={6}
            className={inputClass}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="thumbnail"
              defaultValue={item.thumbnail || ''}
              placeholder="썸네일 URL"
              className={inputClass}
            />
            <input
              name="author"
              defaultValue={item.author || ''}
              placeholder="작성자"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="date"
              name="published_at"
              defaultValue={formatDateInput(item.published_at)}
              className={inputClass}
            />
            <input
              type="number"
              name="display_order"
              defaultValue={item.display_order ?? undefined}
              placeholder="정렬 순서"
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_published"
                defaultChecked={item.is_published ?? false}
              />
              공개 여부
            </label>
          </div>
        </>
      )}
      labels={{
        createTitle: '매거진 글 추가',
        createButton: '추가',
        deleteTitle: '매거진 글 삭제 확인',
        deleteDescription: '이 글을 삭제하시겠습니까?',
        searchLabel: '매거진 검색',
        searchPlaceholder: '검색: 제목/슬러그/작성자',
        searchDescription: '제목, 슬러그, 작성자로 검색할 수 있습니다.',
        addedMessage: '매거진 글이 추가되었습니다.',
        savedMessage: '매거진 글이 저장되었습니다.',
        deletedMessage: '매거진 글이 삭제되었습니다.',
      }}
    />
  );
}
