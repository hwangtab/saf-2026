'use client';

import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { ANIMATION } from '@/lib/constants';
import Section from '@/components/ui/Section';

interface CounterItem {
  label: string;
  value: number;
  unit: string;
}

interface DynamicCounterProps {
  items: CounterItem[];
  locale?: 'ko' | 'en';
}

export default function DynamicCounter({ items, locale = 'ko' }: DynamicCounterProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  return (
    <Section
      ref={ref}
      variant="white"
      prevVariant="canvas-soft"
      padding="none"
      className="py-12 md:py-16"
    >
      <div className="container-max">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {items.map((item) => (
            <div
              key={item.label}
              className="text-center p-6 md:p-8 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <h3 className="text-sm font-medium text-charcoal-muted mb-3">{item.label}</h3>
              <div className="text-5xl md:text-6xl font-bold text-primary">
                <span aria-live="polite" aria-atomic="true">
                  {inView ? (
                    <>
                      <CountUp
                        end={item.value}
                        duration={ANIMATION.COUNTER_DURATION / 1000}
                        separator=","
                      />
                      <span className="text-2xl md:text-3xl">{item.unit}</span>
                    </>
                  ) : (
                    <span>
                      {item.value.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}
                      {item.unit}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
