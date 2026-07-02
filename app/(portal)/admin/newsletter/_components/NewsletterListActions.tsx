'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createNewsletter } from '@/app/actions/admin-newsletter';

export function NewsletterCreateButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await createNewsletter();
            if (result.error || !result.id) {
              setError(result.message);
              return;
            }
            router.push(`/admin/newsletter/${result.id}`);
          })
        }
        className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
      >
        {isPending ? '만드는 중…' : '+ 새 뉴스레터'}
      </button>
      {error && <p className="text-sm text-danger-a11y">{error}</p>}
    </div>
  );
}
