'use client';

import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { useLocale } from 'next-intl';
import { Artwork } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { Link } from '@/i18n/navigation';
import SectionTitle from '@/components/ui/SectionTitle';
import { cn } from '@/lib/utils';

interface ArtworkHighlightSliderProps {
  artworks: Artwork[];
  title?: string;
  viewAllHref?: string;
  theme?: 'dark' | 'light';
}

export default function ArtworkHighlightSlider({
  artworks,
  title,
  viewAllHref,
  theme = 'light',
}: ArtworkHighlightSliderProps) {
  const locale = useLocale();

  const defaultCopy =
    locale === 'en'
      ? {
          title: 'Online showcase highlights',
          viewAll: 'View all artworks',
          play: 'Play',
          pause: 'Pause',
          playAria: 'Play artwork slider',
          pauseAria: 'Pause artwork slider',
        }
      : {
          title: '온라인 전시 하이라이트',
          viewAll: '전체 작품 보기',
          play: '재생',
          pause: '일시정지',
          playAria: '작품 슬라이더 재생',
          pauseAria: '작품 슬라이더 일시정지',
        };

  const resolvedTitle = title ?? defaultCopy.title;
  const resolvedViewAllHref = viewAllHref ?? '/artworks';
  const resolvedViewAllLabel = locale === 'en' ? 'View all →' : '전체 보기 →';

  const [mounted, setMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      dragFree: true,
    },
    [
      AutoScroll({
        playOnInit: true,
        speed: 0.6,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    const plugins = emblaApi.plugins();
    if (!('autoScroll' in plugins)) return;

    const autoScroll = plugins.autoScroll;
    if (isPaused) {
      autoScroll.stop();
      return;
    }
    autoScroll.play();
  }, [emblaApi, isPaused]);

  if (!mounted || artworks.length === 0) {
    return (
      <section className={cn('py-12', theme === 'dark' ? 'bg-charcoal' : 'bg-canvas-soft')}>
        <div className="container-max h-[300px] animate-pulse rounded-xl bg-white/10" />
      </section>
    );
  }

  const isDark = theme === 'dark';

  return (
    <section
      className={cn('py-16 md:py-24 overflow-hidden', isDark ? 'bg-charcoal' : 'bg-canvas-soft')}
    >
      <div className="container-max mb-12 text-center relative">
        <SectionTitle className={cn('mb-4', isDark ? 'text-white' : 'text-charcoal')}>
          {resolvedTitle}
        </SectionTitle>
        <div className="flex justify-center">
          <Link
            href={resolvedViewAllHref}
            className={cn(
              'font-medium border-b transition-colors',
              isDark
                ? 'text-white/70 hover:text-white border-white/30 hover:border-white'
                : 'text-charcoal-muted hover:text-primary border-charcoal-muted/20 hover:border-primary'
            )}
          >
            {resolvedViewAllLabel}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className={cn(
            'absolute right-0 top-0 rounded-md border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            isDark
              ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
              : 'border-charcoal/20 bg-white/80 text-charcoal hover:bg-white'
          )}
          aria-pressed={isPaused}
          aria-label={isPaused ? defaultCopy.playAria : defaultCopy.pauseAria}
        >
          {isPaused ? defaultCopy.play : defaultCopy.pause}
        </button>
      </div>

      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex gap-6 px-4 md:px-8">
          {artworks.map((artwork) => (
            <div
              key={`${artwork.id}-slider`}
              className="embla__slide flex-[0_0_220px] sm:flex-[0_0_260px] md:flex-[0_0_300px]"
            >
              <ArtworkCard
                artwork={artwork}
                variant="gallery"
                theme={theme}
                className={cn(
                  'h-full shadow-sm hover:shadow-xl transition-shadow duration-500',
                  isDark ? 'border border-white/10' : 'border border-gray-200'
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
