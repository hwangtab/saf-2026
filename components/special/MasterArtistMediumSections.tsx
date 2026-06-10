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
  /** 갤러리 배경 톤. 기본 dark(흰 텍스트 헤더). 박생광처럼 흰 벽(light) 갤러리는 'light'. */
  theme?: 'dark' | 'light';
}

const MasterArtistMediumSections = memo(function MasterArtistMediumSections({
  artworks,
  isEnglish,
  returnTo,
  className,
  theme = 'dark',
}: MasterArtistMediumSectionsProps) {
  if (!artworks || artworks.length === 0) return null;

  // 갤러리 배경에 맞춘 섹션 헤더 색상. light(흰 벽) 갤러리는 charcoal로 대비 확보(WCAG AA).
  const headingClass = theme === 'light' ? 'text-charcoal-deep' : 'text-white';
  const countClass = theme === 'light' ? 'text-charcoal-muted' : 'text-white/70';
  const dividerClass = theme === 'light' ? 'bg-charcoal/15' : 'bg-white/10';

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
          <h2 className={`text-lg md:text-xl font-bold ${headingClass} tracking-widest uppercase`}>
            {displayLabel}
          </h2>
          <span className={`text-sm ${countClass} font-mono tabular-nums`}>{artworks.length}</span>
          <div className={`flex-1 h-px ${dividerClass}`} />
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
                <h2
                  className={`text-lg md:text-xl font-bold ${headingClass} tracking-widest uppercase`}
                >
                  {displayLabel}
                </h2>
                <span className={`text-sm ${countClass} font-mono tabular-nums`}>
                  {categoryArtworks.length}
                </span>
                <div className={`flex-1 h-px ${dividerClass}`} />
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
