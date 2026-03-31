'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ExpandableHistoryProps {
  history: string;
  className?: string;
}

export default function ExpandableHistory({ history, className }: ExpandableHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations('expandableHistory');

  // Count lines to determine if we need expand button
  const lines = history.split('\n').filter((line) => line.trim()).length;
  const needsExpand = lines > 3;

  return (
    <div className={cn('bg-gray-50 p-6 rounded-xl', className)}>
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
        {t('title')}
      </h3>
      <div className="relative">
        <p
          className={`text-gray-600 leading-relaxed text-sm whitespace-pre-line ${
            !isExpanded && needsExpand ? 'line-clamp-3' : ''
          }`}
        >
          {history}
        </p>
        {needsExpand && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm font-medium text-primary hover:text-primary-strong transition-colors"
          >
            {isExpanded ? t('collapse') : t('expand')}
          </button>
        )}
      </div>
    </div>
  );
}
