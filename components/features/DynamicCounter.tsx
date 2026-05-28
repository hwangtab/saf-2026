'use client';

import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { ANIMATION } from '@/lib/constants';
import Card from '@/components/ui/Card';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

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
  // CountUp은 JS requestAnimationFrame 기반이라 globals.css의 prefers-reduced-motion CSS
  // guard(animation-duration: 0.01ms)가 적용되지 않음. reduced-motion 사용자는 최종값 즉시 표시.
  const prefersReducedMotion = useReducedMotion();

  return (
    <div ref={ref}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {items.map((item) => (
          <Card key={item.label} className="text-center p-6 md:p-8">
            <h3 className="text-sm font-medium text-charcoal-muted mb-3">{item.label}</h3>
            <div className="text-5xl md:text-6xl font-black text-primary tabular-nums">
              {/* min-width: 최종값 문자수 × 1ch — inView 전환 시 CountUp이 0에서 시작해도
                  컨테이너 폭이 유지되어 CLS 방지 (tabular-nums와 함께 정확히 동작) */}
              <span
                aria-live="polite"
                aria-atomic="true"
                className="inline-block"
                style={{
                  minWidth: `${item.value.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR').length}ch`,
                }}
              >
                {inView ? (
                  prefersReducedMotion ? (
                    <span>
                      {item.value.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}
                      <span className="text-2xl md:text-3xl">{item.unit}</span>
                    </span>
                  ) : (
                    <>
                      <CountUp
                        end={item.value}
                        duration={ANIMATION.COUNTER_DURATION / 1000}
                        separator=","
                      />
                      <span className="text-2xl md:text-3xl">{item.unit}</span>
                    </>
                  )
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
