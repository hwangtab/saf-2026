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

  // Randomize and limit for the slider to ensure variety
  const [displayArtworks, setDisplayArtworks] = useState<Artwork[]>([]);

  const [emblaRef] = useEmblaCarousel(
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
    // Shuffle all available artworks and take a good number for the slider
    const shuffled = [...artworks].sort(() => 0.5 - Math.random());
    // Doubling the array can help with smoother infinite loop if items are few,
    // but with many artworks, we just take enough to feel "endless"
    setDisplayArtworks(shuffled.slice(0, 30));
  }, [artworks]);

  if (!mounted || displayArtworks.length === 0) {
    return (
      <Section variant="white" className="py-12 bg-canvas-soft/30">
        <div className="container-max h-[300px] animate-pulse bg-gray-100 rounded-xl" />
      </Section>
    );
  }

  return (
    <Section variant="canvas-soft" className="py-16 md:py-24 overflow-hidden">
      <div className="container-max mb-10">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-primary font-bold text-sm tracking-wider uppercase mb-2 block">
              Online Showcase
            </span>
            <SectionTitle className="mb-0 text-left">온라인 전시 하이라이트</SectionTitle>
          </div>
          <Link
            href="/artworks"
            className="text-charcoal-muted hover:text-primary transition-colors font-medium hidden sm:block"
          >
            전체 작품 보기 &rarr;
          </Link>
        </div>
      </div>

      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex gap-6 px-4 md:px-8">
          {displayArtworks.map((artwork) => (
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

      <div className="mt-10 text-center sm:hidden">
        <Link href="/artworks" className="text-primary font-bold">
          전체 작품 보기 &rarr;
        </Link>
      </div>
    </Section>
  );
}
