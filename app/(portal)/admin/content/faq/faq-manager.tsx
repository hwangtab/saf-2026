'use client';

import { createFaq, updateFaq, deleteFaq } from '@/app/actions/admin-content';
import { AdminInput, AdminTextarea } from '@/app/admin/_components/admin-ui';
import { CRUDManager } from '../_components/CRUDManager';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  question_en: string | null;
  answer_en: string | null;
  display_order: number | null;
};

export function FaqManager({ faqs }: { faqs: FaqItem[] }) {
  return (
    <CRUDManager<FaqItem>
      items={faqs}
      actions={{
        create: createFaq,
        update: updateFaq,
        delete: deleteFaq,
      }}
      searchFields={(item) => [item.question, item.answer, item.question_en, item.answer_en]}
      extractOptimisticUpdate={(formData) => ({
        question: formData.get('question') as string,
        answer: formData.get('answer') as string,
        question_en: (formData.get('question_en') as string) || null,
        answer_en: (formData.get('answer_en') as string) || null,
        display_order: Number(formData.get('display_order')),
      })}
      renderCreateForm={() => (
        <>
          <AdminInput name="question" required placeholder="질문" />
          <AdminTextarea name="answer" required rows={4} placeholder="답변" />
          <AdminInput name="question_en" placeholder="Question (English)" />
          <AdminTextarea name="answer_en" rows={4} placeholder="Answer (English)" />
          <AdminInput type="number" name="display_order" placeholder="노출 순서 (숫자)" />
        </>
      )}
      renderEditForm={(item) => (
        <>
          <AdminInput name="question" required defaultValue={item.question} placeholder="질문" />
          <AdminTextarea
            name="answer"
            required
            rows={4}
            defaultValue={item.answer}
            placeholder="답변"
          />
          <AdminInput
            name="question_en"
            defaultValue={item.question_en ?? ''}
            placeholder="Question (English)"
          />
          <AdminTextarea
            name="answer_en"
            rows={4}
            defaultValue={item.answer_en ?? ''}
            placeholder="Answer (English)"
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
        createTitle: 'FAQ 추가',
        createButton: '추가',
        deleteTitle: 'FAQ 삭제 확인',
        deleteDescription: '이 FAQ를 삭제하시겠습니까?',
        searchLabel: 'FAQ 검색',
        searchPlaceholder: '검색: 질문/답변',
        searchDescription: 'FAQ 질문 또는 답변으로 검색할 수 있습니다.',
        addedMessage: 'FAQ added.',
        savedMessage: 'FAQ saved.',
        deletedMessage: 'FAQ deleted.',
      }}
    />
  );
}
