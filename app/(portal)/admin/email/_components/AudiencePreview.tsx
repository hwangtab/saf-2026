'use client';

import { useState } from 'react';
import { previewAudience } from '@/app/actions/admin-broadcast';
import type { BroadcastChannel } from '@/lib/email/audiences/types';

interface Props {
  channel: BroadcastChannel;
}

export function AudiencePreview({ channel }: Props) {
  const [result, setResult] = useState<{
    total: number;
    breakdown: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const r = await previewAudience(channel);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handlePreview}
        disabled={loading}
        className="text-sm text-primary underline underline-offset-2 disabled:opacity-50"
      >
        {loading ? '조회 중…' : '수신자 수 미리보기'}
      </button>
      {result !== null && (
        <span className="text-sm text-charcoal">
          총 <strong>{result.total.toLocaleString('ko-KR')}명</strong>
          {Object.keys(result.breakdown).length > 1 && (
            <span className="ml-1 text-xs text-charcoal-muted">
              (
              {Object.entries(result.breakdown)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')}
              )
            </span>
          )}
        </span>
      )}
    </div>
  );
}
