'use client';

import { FAQItem } from '@/content/faq';

interface FAQListProps {
  items: FAQItem[];
}

export default function FAQList({ items }: FAQListProps) {
  // Optional: Add state if we want to allow only one open at a time,
  // but standard details/summary works fine without JS for basic behavior.
  // We'll stick to native behavior for simplicity and interaction performance,
  // but we can add a small animation wrapper if needed.
  // For now, let's just use standard detailed/summary with Tailwind.

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {items.map((item, index) => (
        <details
          key={index}
          className="group border border-gray-200 rounded-xl bg-white overflow-hidden [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer font-medium text-lg text-charcoal hover:bg-gray-50 transition-colors">
            <span>{item.question}</span>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </span>
          </summary>
          <div className="px-6 pb-6 text-charcoal-muted leading-relaxed whitespace-pre-line animate-slideDown">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
