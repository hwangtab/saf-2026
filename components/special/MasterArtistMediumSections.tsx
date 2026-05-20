import { memo } from 'react';
import MasterArtistGallery from './MasterArtistGallery';
import type { ArtworkListItem } from '@/types';

const CATEGORY_LABELS: Record<string, { ko: string; en: string }> = {
  회화: { ko: '회화', en: 'Painting' },
  한국화: { ko: '한국화', en: 'Korean Ink Painting' },
  드로잉: { ko: '드로잉', en: 'Drawing' },
  혼합매체: { ko: '혼합매체', en: 'Mixed Media' },
  판화: { ko: '판화', en: 'Printmaking' },
  사후판화: { ko: '사후판화', en: 'Posthumous Edition' },
  사진: { ko: '사진', en: 'Photography' },
  디지털아트: { ko: '디지털아트', en: 'Digital Art' },
  조각: { ko: '조각', en: 'Sculpture' },
  도자공예: { ko: '도자공예', en: 'Ceramic' },
  아트프린트: { ko: '아트프린트', en: 'Art Print' },
};

const CATEGORY_ORDER = [
  '회화',
  '한국화',
  '드로잉',
  '혼합매체',
  '판화',
  '사후판화',
  '사진',
  '디지털아트',
  '조각',
  '도자공예',
  '아트프린트',
];

interface MasterArtistMediumSectionsProps {
  artworks: ArtworkListItem[];
  isEnglish: boolean;
  returnTo: string;
  className?: string;
}

const MasterArtistMediumSections = memo(function MasterArtistMediumSections({
  artworks,
  isEnglish,
  returnTo,
  className,
}: MasterArtistMediumSectionsProps) {
  if (!artworks || artworks.length === 0) return null;

  const grouped = new Map<string, ArtworkListItem[]>();
  artworks.forEach((a) => {
    const key = a.category ?? '_other';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  });

  const orderedKeys = [
    ...CATEGORY_ORDER.filter((k) => grouped.has(k)),
    ...Array.from(grouped.keys()).filter((k) => !CATEGORY_ORDER.includes(k) && k !== '_other'),
    ...(grouped.has('_other') ? ['_other'] : []),
  ];

  if (orderedKeys.length === 1 && orderedKeys[0] !== '_other') {
    const singleKey = orderedKeys[0];
    const label = CATEGORY_LABELS[singleKey];
    const displayLabel = label ? (isEnglish ? label.en : label.ko) : singleKey;
    return (
      <div className={className}>
        <div className="flex items-center gap-4 mb-10">
          <h2 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase">
            {displayLabel}
          </h2>
          <span className="text-sm text-white/70 font-mono tabular-nums">{artworks.length}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <MasterArtistGallery artworks={artworks} returnTo={returnTo} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-20">
        {orderedKeys.map((categoryKey) => {
          const categoryArtworks = grouped.get(categoryKey)!;
          const label = CATEGORY_LABELS[categoryKey];
          const displayLabel = label
            ? isEnglish
              ? label.en
              : label.ko
            : categoryKey === '_other'
              ? isEnglish
                ? 'Other'
                : '기타'
              : categoryKey;

          return (
            <section key={categoryKey} aria-label={displayLabel}>
              <div className="flex items-center gap-4 mb-10">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-widest uppercase">
                  {displayLabel}
                </h2>
                <span className="text-sm text-white/70 font-mono tabular-nums">
                  {categoryArtworks.length}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <MasterArtistGallery artworks={categoryArtworks} returnTo={returnTo} />
            </section>
          );
        })}
      </div>
    </div>
  );
});

export default MasterArtistMediumSections;
