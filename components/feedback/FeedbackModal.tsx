'use client';

import { useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { submitFeedback } from '@/app/actions/feedback';
import { useToast } from '@/lib/hooks/useToast';
import type { FeedbackCategory } from '@/types';

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: '버그 신고' },
  { value: 'improvement', label: '개선 요청' },
  { value: 'question', label: '질문' },
  { value: 'other', label: '기타' },
];

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const pathname = usePathname();
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
        setError(result.error);
        return;
      }
      toast.success('소중한 의견이 전달되었습니다. 감사합니다!');
      formRef.current?.reset();
      handleClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="의견 보내기" className="max-w-lg">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="feedback-category"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            카테고리
          </label>
          <select
            id="feedback-category"
            name="category"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {CATEGORY_OPTIONS.map((opt) => (
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
            제목
          </label>
          <input
            id="feedback-title"
            name="title"
            type="text"
            required
            maxLength={100}
            placeholder="간단히 요약해주세요"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="feedback-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            상세 내용
          </label>
          <textarea
            id="feedback-description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            placeholder="어떤 상황에서 발생했는지, 어떻게 개선되면 좋겠는지 알려주세요"
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
            취소
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? '전송 중...' : '보내기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
