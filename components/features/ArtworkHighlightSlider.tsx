'use client';

import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { Artwork } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';
import Link from 'next/link';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';

interface ArtworkHighlightSliderProps {
  artworks: Artwork[];
}

export default function ArtworkHighlightSlider({ artworks }: ArtworkHighlightSliderProps) {
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
      <Section variant="white" className="py-12 bg-canvas-soft/30">
        <div className="container-max h-[300px] animate-pulse bg-gray-100 rounded-xl" />
      </Section>
    );
  }

  return (
    <Section variant="canvas-soft" className="py-16 md:py-24 overflow-hidden">
      <div className="container-max mb-12 text-center relative">
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary text-primary text-xs font-semibold tracking-wide uppercase mb-4">
          Online Showcase
        </div>
        <SectionTitle className="mb-4">온라인 전시 하이라이트</SectionTitle>
        <div className="flex justify-center">
          <Link
            href="/artworks"
            className="text-charcoal-muted hover:text-primary transition-colors font-medium border-b border-charcoal-muted/20 hover:border-primary"
          >
            전체 작품 보기 &rarr;
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="absolute right-0 top-0 rounded-md border border-charcoal/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-pressed={isPaused}
          aria-label={isPaused ? '작품 슬라이더 재생' : '작품 슬라이더 일시정지'}
        >
          {isPaused ? '재생' : '일시정지'}
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
                className="h-full border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500"
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
