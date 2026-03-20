'use client';

import {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '@/app/actions/admin-content';
import { AdminInput, AdminTextarea } from '@/app/admin/_components/admin-ui';
import { CRUDManager } from '../_components/CRUDManager';

type TestimonialItem = {
  id: string;
  category: string;
  quote: string;
  author: string;
  context: string | null;
  display_order: number | null;
};

export function TestimonialsManager({ testimonials }: { testimonials: TestimonialItem[] }) {
  return (
    <CRUDManager<TestimonialItem>
      items={testimonials}
      actions={{
        create: createTestimonial,
        update: updateTestimonial,
        delete: deleteTestimonial,
      }}
      searchFields={(item) => [item.category, item.author, item.quote]}
      extractOptimisticUpdate={(formData) => ({
        category: formData.get('category') as string,
        author: formData.get('author') as string,
        quote: formData.get('quote') as string,
        context: formData.get('context') as string,
        display_order: Number(formData.get('display_order')),
      })}
      renderCreateForm={() => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput name="category" required placeholder="카테고리" />
            <AdminInput name="author" required placeholder="작성자" />
          </div>
          <AdminTextarea name="quote" required rows={3} placeholder="추천사 내용" />
          <AdminInput name="context" placeholder="컨텍스트 (선택)" />
          <AdminInput type="number" name="display_order" placeholder="노출 순서 (숫자)" />
        </>
      )}
      renderEditForm={(item) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput
              name="category"
              required
              defaultValue={item.category}
              placeholder="카테고리"
            />
            <AdminInput name="author" required defaultValue={item.author} placeholder="작성자" />
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
        </>
      )}
      labels={{
        createTitle: '추천사 추가',
        createButton: '추가',
        deleteTitle: '추천사 삭제 확인',
        deleteDescription: '이 추천사를 삭제하시겠습니까?',
        searchLabel: '추천사 검색',
        searchPlaceholder: '검색: 카테고리/작성자/내용',
        searchDescription: '추천사 카테고리, 작성자 또는 내용으로 검색할 수 있습니다.',
        addedMessage: 'Testimonial added.',
        savedMessage: 'Testimonial saved.',
        deletedMessage: 'Testimonial deleted.',
      }}
    />
  );
}
