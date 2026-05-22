'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useWishlist } from '@/components/providers/WishlistProvider';
import ArtworkGridCard from '@/components/features/ArtworkGridCard';
import WishlistHeartButton from '@/components/features/WishlistHeartButton';
import type { Artwork } from '@/types';

interface WishlistPageContentProps {
  locale: string;
  untitledLabel: string;
  unknownArtistLabel: string;
  pendingInfoLabel: string;
  originalKoreanDataLabel: string;
  soldLabel: string;
  reservedLabel: string;
  pendingValueLabel: string;
  inquiryValueLabel: string;
}

export default function WishlistPageContent({
  locale,
  untitledLabel,
  unknownArtistLabel,
  pendingInfoLabel,
  originalKoreanDataLabel,
  soldLabel,
  reservedLabel,
  pendingValueLabel,
  inquiryValueLabel,
}: WishlistPageContentProps) {
  const { ids, mounted } = useWishlist();
  const t = useTranslations('wishlist');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchArtworks = useCallback(async (wishlistIds: string[]) => {
    if (wishlistIds.length === 0) {
      setArtworks([]);
      setFetchError(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`/api/artworks/batch?ids=${wishlistIds.join(',')}`);
      if (!res.ok) throw new Error('fetch failed');
      const data: Artwork[] = await res.json();
      // IDs 순서 유지 (최근 추가 순)
      const ordered = wishlistIds
        .map((id) => data.find((a) => a.id === id))
        .filter((a): a is Artwork => a != null);
      setArtworks(ordered);
    } catch {
      setFetchError(true);
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchArtworks(ids);
  }, [ids, mounted, fetchArtworks]);

  if (!mounted || loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: ids.length || 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gray-100 aspect-[4/5] animate-pulse" />
        ))}
      </div>
    );
  }

  if (ids.length > 0 && fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-charcoal mb-4">{t('fetchError')}</p>
        <button
          onClick={() => fetchArtworks(ids)}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-primary text-white hover:bg-primary-strong transition-colors"
        >
          {t('retryLoad')}
        </button>
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Heart className="w-12 h-12 text-gray-300 mb-4" aria-hidden="true" />
        <p className="text-lg font-semibold text-charcoal mb-2">{t('pageEmpty')}</p>
        <p className="text-sm text-charcoal-muted mb-8 max-w-xs">{t('pageEmptyDesc')}</p>
        <Link
          href="/artworks"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-primary text-white hover:bg-primary-strong transition-colors"
        >
          {t('browseArtworks')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {artworks.map((artwork) => (
        <ArtworkGridCard
          key={artwork.id}
          artwork={artwork}
          locale={locale}
          untitledLabel={untitledLabel}
          unknownArtistLabel={unknownArtistLabel}
          pendingInfoLabel={pendingInfoLabel}
          originalKoreanDataLabel={originalKoreanDataLabel}
          soldLabel={soldLabel}
          reservedLabel={reservedLabel}
          pendingValueLabel={pendingValueLabel}
          inquiryValueLabel={inquiryValueLabel}
          sizesOverride="(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) calc(33vw - 1.5rem), 280px"
          wishlistSlot={(title) => (
            <WishlistHeartButton artworkId={artwork.id} artworkTitle={title} variant="overlay" />
          )}
        />
      ))}
    </div>
  );
}
