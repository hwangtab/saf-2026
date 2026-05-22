'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { getWishlist, removeFromWishlist as removeLocal } from '@/lib/wishlist';
import { bulkAddToWishlist } from '@/app/actions/mypage';
import SafeImage from '@/components/common/SafeImage';
import type { Artwork } from '@/types';

interface WishlistTabProps {
  userId: string;
  initialWishlistIds: string[];
  emptyMessage: string;
  browseLabel: string;
}

export default function WishlistTab({
  userId: _userId,
  initialWishlistIds,
  emptyMessage,
  browseLabel,
}: WishlistTabProps) {
  const [ids, setIds] = useState<string[]>(initialWishlistIds);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [merged, setMerged] = useState(false);

  // localStorage → DB 머지 (최초 1회)
  useEffect(() => {
    if (merged) return;
    const localIds = getLocal();
    const newIds = localIds.filter((id) => !initialWishlistIds.includes(id));

    if (newIds.length > 0) {
      bulkAddToWishlist(newIds).then((result) => {
        if (!result.error) {
          newIds.forEach((id) => removeLocal(id));
          setIds((prev) => {
            const merged = [...new Set([...newIds, ...prev])];
            return merged;
          });
        }
        setMerged(true);
      });
    } else {
      setMerged(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchArtworks = useCallback(async (wishlistIds: string[]) => {
    if (wishlistIds.length === 0) {
      setArtworks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/artworks/batch?ids=${wishlistIds.join(',')}`);
      if (!res.ok) throw new Error('fetch failed');
      const data: Artwork[] = await res.json();
      const ordered = wishlistIds
        .map((id) => data.find((a) => a.id === id))
        .filter((a): a is Artwork => a != null);
      setArtworks(ordered);
    } catch {
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtworks(ids);
  }, [ids, fetchArtworks]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: Math.max(ids.length, 4) }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gray-100 aspect-[4/5] animate-pulse" />
        ))}
      </div>
    );
  }

  if (artworks.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-charcoal-muted">{emptyMessage}</p>
        <Link
          href="/artworks"
          className="inline-block text-sm font-medium text-primary-a11y hover:text-primary border border-primary/30 rounded-full px-4 py-2 transition-colors hover:bg-primary/5"
        >
          {browseLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {artworks.map((artwork) => (
        <Link key={artwork.id} href={`/artworks/${artwork.id}`} className="group block">
          <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[4/5] relative">
            {artwork.images[0] && (
              <SafeImage
                src={`/images/artworks/${artwork.images[0]}`}
                alt={artwork.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )}
          </div>
          <div className="mt-2 px-0.5">
            <p className="text-sm font-medium text-charcoal truncate">{artwork.title}</p>
            <p className="text-xs text-charcoal-muted">{artwork.artist}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function getLocal(): string[] {
  try {
    return getWishlist();
  } catch {
    return [];
  }
}
