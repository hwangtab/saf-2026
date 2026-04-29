'use client';

import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { ANIMATION } from '@/lib/constants';
import Card from '@/components/ui/Card';

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
    <div ref={ref}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {items.map((item) => (
          <Card key={item.label} className="text-center p-6 md:p-8">
            <h3 className="text-sm font-medium text-charcoal-muted mb-3">{item.label}</h3>
            <div className="text-5xl md:text-6xl font-black text-primary">
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
          </Card>
        ))}
      </div>
    </div>
  );
}
