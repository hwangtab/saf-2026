'use client';

import { useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { submitFeedback } from '@/app/actions/feedback';
import { useToast } from '@/lib/hooks/useToast';
import type { FeedbackCategory } from '@/types';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

const FEEDBACK_MODAL_COPY: Record<
  LocaleCode,
  {
    success: string;
    submitError: string;
    title: string;
    category: string;
    titleLabel: string;
    titlePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    cancel: string;
    sending: string;
    send: string;
  }
> = {
  ko: {
    success: '소중한 의견이 전달되었습니다. 감사합니다!',
    submitError: '의견 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    title: '의견 보내기',
    category: '카테고리',
    titleLabel: '제목',
    titlePlaceholder: '간단히 요약해주세요',
    description: '상세 내용',
    descriptionPlaceholder: '어떤 상황에서 발생했는지, 어떻게 개선되면 좋겠는지 알려주세요',
    cancel: '취소',
    sending: '전송 중...',
    send: '보내기',
  },
  en: {
    success: 'Thank you! Your feedback has been submitted.',
    submitError: 'An error occurred while submitting feedback. Please try again shortly.',
    title: 'Send feedback',
    category: 'Category',
    titleLabel: 'Title',
    titlePlaceholder: 'Please summarize briefly',
    description: 'Details',
    descriptionPlaceholder: 'Tell us what happened and how you would like it improved',
    cancel: 'Cancel',
    sending: 'Sending...',
    send: 'Send',
  },
};

const CATEGORY_OPTIONS_BY_LOCALE: Record<LocaleCode, { value: FeedbackCategory; label: string }[]> =
  {
    ko: [
      { value: 'bug', label: '버그 신고' },
      { value: 'improvement', label: '개선 요청' },
      { value: 'question', label: '질문' },
      { value: 'other', label: '기타' },
    ],
    en: [
      { value: 'bug', label: 'Bug report' },
      { value: 'improvement', label: 'Improvement request' },
      { value: 'question', label: 'Question' },
      { value: 'other', label: 'Other' },
    ],
  };

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = FEEDBACK_MODAL_COPY[locale];
  const categoryOptions = CATEGORY_OPTIONS_BY_LOCALE[locale];
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('page_url', pathname);

    startTransition(async () => {
      setError(null);
      const result = await submitFeedback(formData);
      if (result.error) {
        setError(locale === 'en' ? copy.submitError : result.error);
        return;
      }
      toast.success(copy.success);
      formRef.current?.reset();
      handleClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={copy.title} className="max-w-lg">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="feedback-category"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {copy.category}
          </label>
          <select
            id="feedback-category"
            name="category"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="feedback-title"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {copy.titleLabel}
          </label>
          <input
            id="feedback-title"
            name="title"
            type="text"
            required
            maxLength={100}
            placeholder={copy.titlePlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="feedback-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {copy.description}
          </label>
          <textarea
            id="feedback-description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            placeholder={copy.descriptionPlaceholder}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            {copy.cancel}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? copy.sending : copy.send}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
