'use client';

import { useState } from 'react';

interface ExpandableHistoryProps {
  history: string;
}

export default function ExpandableHistory({ history }: ExpandableHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count lines to determine if we need expand button
  const lines = history.split('\n').filter((line) => line.trim()).length;
  const needsExpand = lines > 3;

  return (
    <div className="bg-gray-50 p-6 rounded-xl">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">주요 경력</h3>
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
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm font-medium text-primary hover:text-primary-strong transition-colors"
          >
            {isExpanded ? '접기 ▲' : '더보기 ▼'}
          </button>
        )}
      </div>
    </div>
  );
}
