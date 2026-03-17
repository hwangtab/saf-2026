'use client';

import { useState } from 'react';
import type { FAQItem } from '@/content/faq';
import { ChevronDownIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

interface FAQListProps {
  items: FAQItem[];
}

export default function FAQList({ items }: FAQListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={`${item.question}-${item.answer.slice(0, 32)}`}
            className="border border-gray-200 rounded-xl bg-white overflow-hidden transition-all duration-200 hover:border-gray-300"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full flex items-center justify-between gap-4 p-6 text-left cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              aria-expanded={isOpen}
              aria-controls={`faq-content-${index}`}
            >
              <span className="font-medium text-lg text-charcoal">{item.question}</span>
              <span
                className={cn(
                  'text-gray-400 transition-transform duration-300 transform',
                  isOpen && 'rotate-180'
                )}
              >
                <ChevronDownIcon className="w-5 h-5" />
              </span>
            </button>
            <div
              id={`faq-content-${index}`}
              role="region"
              aria-hidden={!isOpen}
              className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-6 text-charcoal-muted leading-relaxed whitespace-pre-line border-t border-gray-100 pt-6">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
