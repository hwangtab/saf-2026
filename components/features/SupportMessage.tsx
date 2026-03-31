'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';
import LinkButton from '@/components/ui/LinkButton';

const STAT_COUNT = 4;
const TESTIMONIAL_COUNT = 5;
const STAT_INTERVAL = 6000;
const TESTIMONIAL_INTERVAL = 12000;

interface SupportMessageProps {
  className?: string;
  totalSoldCount?: number;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function useCycleIndex(count: number, interval: number, enabled: boolean) {
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [enabled, interval, next]);
  return index;
}

export default function SupportMessage({ className, totalSoldCount }: SupportMessageProps) {
  const t = useTranslations('support');
  const reducedMotion = useReducedMotion();

  const statIndex = useCycleIndex(STAT_COUNT, STAT_INTERVAL, !reducedMotion);
  const testimonialIndex = useCycleIndex(TESTIMONIAL_COUNT, TESTIMONIAL_INTERVAL, !reducedMotion);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-white border border-primary/10 p-6',
        className
      )}
    >
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* 영역 1: 헤더 + 통계 */}
        <div className="flex flex-col items-center gap-3 w-full">
          <Sprout className="w-8 h-8 text-primary" />
          <h3 className="font-bold text-gray-800 text-lg break-keep text-center">{t('title')}</h3>

          {/* 순환 통계 콜아웃 */}
          <div className="w-full rounded-xl bg-primary/[0.08] py-3 px-4 relative min-h-[60px]">
            <div aria-live="polite">
              {Array.from({ length: STAT_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'transition-opacity duration-500 text-center',
                    i === 0
                      ? ''
                      : 'absolute inset-0 flex flex-col items-center justify-center px-4',
                    i === statIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  )}
                >
                  <p className="text-2xl font-bold text-primary">
                    {t(`stat${i}Value` as 'stat0Value')}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 break-keep">
                    {t(`stat${i}Label` as 'stat0Label')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 영역 2: 캠페인 메시지 + 증언 카드 */}
        <div className="w-full flex flex-col gap-4">
          <p className="text-sm text-gray-600 break-keep leading-relaxed whitespace-pre-line text-left">
            {t('body')}
          </p>

          {/* 증언 카드 */}
          <div className="w-full bg-gray-50/80 rounded-xl p-4 border-l-4 border-primary/30">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">
              {t('voiceLabel')}
            </p>
            <div className="relative min-h-[72px]" aria-live="polite">
              {Array.from({ length: TESTIMONIAL_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'transition-opacity duration-700',
                    i === 0 ? '' : 'absolute inset-0 flex flex-col justify-center',
                    i === testimonialIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  )}
                >
                  <p className="text-sm text-gray-700 italic break-keep leading-relaxed">
                    &ldquo;{t(`testimonial${i}Quote` as 'testimonial0Quote')}&rdquo;
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    — {t(`testimonial${i}Author` as 'testimonial0Author')}
                  </p>
                </div>
              ))}
            </div>
            {/* 슬라이드 인디케이터 */}
            <div className="flex justify-center gap-1.5 mt-3">
              {Array.from({ length: TESTIMONIAL_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors duration-500',
                    i === testimonialIndex ? 'bg-primary/60' : 'bg-gray-300'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 영역 3: 사회적 증거 + CTA */}
        <div className="w-full flex flex-col items-center gap-3 pt-1 border-t border-primary/10">
          {totalSoldCount && totalSoldCount > 0 ? (
            <p className="text-sm text-primary font-medium break-keep text-center">
              {t('soldCount', { count: totalSoldCount })}
            </p>
          ) : null}
          <p className="text-xs text-primary-strong break-keep font-medium opacity-80 text-center">
            {t('footer')}
          </p>
          <LinkButton href="/artworks" variant="outline">
            {t('exploreArtworks')}
          </LinkButton>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}
