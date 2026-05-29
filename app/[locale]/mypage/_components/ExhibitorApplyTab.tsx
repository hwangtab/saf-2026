'use client';

import { useRouter } from '@/i18n/navigation';
import Button from '@/components/ui/Button';

interface ExhibitorApplyTabProps {
  heading: string;
  body: string;
  ctaLabel: string;
}

export default function ExhibitorApplyTab({ heading, body, ctaLabel }: ExhibitorApplyTabProps) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <h2 className="text-lg font-bold text-charcoal-deep mb-3">{heading}</h2>
      <p className="text-sm text-charcoal-muted mb-6 leading-relaxed">{body}</p>
      <Button
        variant="primary"
        className="justify-center"
        onClick={() => router.push('/exhibitor/onboarding')}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
