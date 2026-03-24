'use client';

import { useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { submitFeedback } from '@/app/actions/feedback';
import { useToast } from '@/lib/hooks/useToast';
import type { FeedbackCategory } from '@/types';

const CATEGORY_KEYS: FeedbackCategory[] = ['bug', 'improvement', 'question', 'other'];

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('feedbackWidget');
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
        setError(locale === 'en' ? t('submitError') : result.error);
        return;
      }
      toast.success(t('success'));
      formRef.current?.reset();
      handleClose();
    });
  };

  const categoryLabelMap: Record<FeedbackCategory, string> = {
    bug: t('categoryBug'),
    improvement: t('categoryImprovement'),
    question: t('categoryQuestion'),
    other: t('categoryOther'),
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('title')} className="max-w-lg">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="feedback-category"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {t('category')}
          </label>
          <select
            id="feedback-category"
            name="category"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus-visible:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900"
          >
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {categoryLabelMap[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="feedback-title"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {t('titleLabel')}
          </label>
          <input
            id="feedback-title"
            name="title"
            type="text"
            required
            maxLength={100}
            placeholder={t('titlePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus-visible:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="feedback-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {t('description')}
          </label>
          <textarea
            id="feedback-description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            placeholder={t('descriptionPlaceholder')}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus-visible:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t('sending') : t('send')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
