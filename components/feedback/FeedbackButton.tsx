'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import FeedbackModal from './FeedbackModal';

export default function FeedbackButton() {
  const t = useTranslations('feedbackWidget');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-700 hover:shadow-xl active:scale-95"
        aria-label={t('buttonLabel')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.202 41.202 0 01-5.183.501.78.78 0 00-.528.224l-3.579 3.58A.75.75 0 016 17.25v-3.443a41.033 41.033 0 01-2.57-.33C1.993 13.244 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902z"
            clipRule="evenodd"
          />
        </svg>
        <span className="hidden sm:inline">{t('buttonLabel')}</span>
      </button>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
