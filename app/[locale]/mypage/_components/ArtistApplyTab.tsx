'use client';

import Button from '@/components/ui/Button';

interface ArtistApplyTabProps {
  heading: string;
  body: string;
  ctaLabel: string;
}

export default function ArtistApplyTab({ heading, body, ctaLabel }: ArtistApplyTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <h2 className="text-lg font-bold text-charcoal-deep mb-3">{heading}</h2>
      <p className="text-sm text-charcoal-muted mb-6 leading-relaxed">{body}</p>
      <Button href="/onboarding" variant="primary" className="justify-center">
        {ctaLabel}
      </Button>
    </div>
  );
}
