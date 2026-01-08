'use client';

import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { ANIMATION } from '@/lib/constants';

interface CounterItem {
  label: string;
  value: number;
  unit: string;
}

interface DynamicCounterProps {
  items: CounterItem[];
}

export default function DynamicCounter({ items }: DynamicCounterProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  return (
    <section ref={ref} className="py-12 bg-canvas-soft">
      <div className="container-max">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <div
              key={index}
              className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
            >
              <h3 className="font-sans font-bold text-sm font-medium text-charcoal-muted mb-2">
                {item.label}
              </h3>
              <div className="text-3xl font-bold text-primary">
                <span aria-live="polite" aria-atomic="true">
                  {inView ? (
                    <>
                      <CountUp
                        end={item.value}
                        duration={ANIMATION.COUNTER_DURATION / 1000}
                        separator=","
                      />
                      <span className="text-lg">{item.unit}</span>
                    </>
                  ) : (
                    <span>0{item.unit}</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
