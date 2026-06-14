'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { useCart } from '@/components/providers/CartProvider';
import { getCartArtworks, type CartArtworkInfo } from '@/app/actions/cart-artworks';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';
import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/ui/Button';

function formatKRW(value: number): string {
  return `₩${value.toLocaleString('ko-KR')}`;
}

export default function CartPageContent() {
  const t = useTranslations('cart');
  const { items, setQuantity, remove, clear, mounted } = useCart();

  const [details, setDetails] = useState<CartArtworkInfo[]>([]);
  // 초기 true — 첫 fetch 완료 전 항목이 잠깐 '품절/없음'으로 깜빡이는 것 방지(missing 판정 억제).
  const [loading, setLoading] = useState(true);

  const itemIds = items.map((i) => i.artworkId);
  const idsKey = itemIds.join(',');

  useEffect(() => {
    if (!mounted) return;
    if (itemIds.length === 0) {
      setDetails([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCartArtworks(itemIds)
      .then((rows) => {
        if (!cancelled) setDetails(rows);
      })
      .catch(() => {
        if (!cancelled) setDetails([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // idsKey가 항목 구성을 대표 — itemIds 배열 참조 변화로 인한 과도 재조회 방지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, idsKey]);

  const detailById = useCallback(
    (id: string) => details.find((d) => d.id === id) ?? null,
    [details]
  );

  // 하이드레이션 mismatch 방지 — mount 전엔 빈 자리만 차지.
  if (!mounted) {
    return <div className="min-h-[40vh]" aria-hidden="true" />;
  }

  const hasItems = items.length > 0;

  // 빈 카트
  if (!hasItems) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-lg font-semibold text-charcoal-deep">{t('empty')}</p>
        <p className="text-sm text-charcoal-muted">{t('emptyHint')}</p>
        <Button href="/artworks" variant="primary" className="mt-2">
          {t('browseArtworks')}
        </Button>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => {
    const info = detailById(item.artworkId);
    return sum + (info ? info.price * item.quantity : 0);
  }, 0);
  // 결제 가능 = detail 존재 + isAvailable. 숨김/삭제된 작품은 getCartArtworks 결과에 없으므로
  // (detail 누락) 누락 id도 unavailable 취급 — 빈 행 + 결제활성 막다른길 방지. (로드 중엔 판정 보류)
  const isUnavailable = (id: string) => {
    const info = detailById(id);
    if (info) return info.isAvailable === false;
    return !loading;
  };
  const hasSoldOut = items.some((item) => isUnavailable(item.artworkId));

  const handleClear = () => {
    if (window.confirm(t('clearConfirm'))) clear();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
      {/* 항목 목록 */}
      <ul className="divide-y divide-gallery-divider rounded-2xl border border-gallery-hairline bg-canvas-soft lg:col-span-2">
        {items.map((item) => {
          const info = detailById(item.artworkId);
          const soldOut = isUnavailable(item.artworkId);
          const isUnique = info?.editionType === 'unique';
          const imageSrc = info?.image ? resolveArtworkImageUrl(info.image) : '';

          return (
            <li
              key={item.artworkId}
              className={clsx('flex gap-4 p-4 sm:p-5', soldOut && 'opacity-70')}
            >
              {/* 썸네일 */}
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gallery-hairline bg-canvas-strong sm:h-28 sm:w-28">
                {imageSrc ? (
                  <SafeImage
                    src={imageSrc}
                    alt={info?.title ?? ''}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-canvas-strong" aria-hidden="true" />
                )}
              </div>

              {/* 정보 + 컨트롤 */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-artwork-title truncate text-base text-charcoal-deep">
                      {info?.title || (soldOut ? t('unavailableTitle') : ' ')}
                    </p>
                    {info?.artistName ? (
                      <p className="text-caption-meta truncate">{info.artistName}</p>
                    ) : null}
                    {soldOut ? (
                      <span className="mt-1 inline-flex w-fit items-center rounded bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger-a11y">
                        {t('soldOut')}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.artworkId)}
                    aria-label={t('remove')}
                    className="inline-flex min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center rounded-md text-charcoal-soft transition-colors hover:bg-gray-100 hover:text-danger-a11y"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mt-auto flex items-end justify-between pt-3">
                  {/* 수량 스테퍼 */}
                  {isUnique ? (
                    <span className="text-xs text-charcoal-muted" title={t('uniqueQtyLocked')}>
                      {t('uniqueQtyLocked')}
                    </span>
                  ) : (
                    <div className="inline-flex items-center rounded-md border border-gallery-hairline">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.artworkId, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        aria-label={t('decrease')}
                        className="inline-flex h-9 w-9 items-center justify-center text-charcoal-muted transition-colors hover:text-charcoal disabled:opacity-40"
                      >
                        −
                      </button>
                      <span
                        className="min-w-[2.5rem] text-center text-sm tabular-nums text-charcoal-deep"
                        aria-label={t('quantity')}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.artworkId, item.quantity + 1)}
                        aria-label={t('increase')}
                        className="inline-flex h-9 w-9 items-center justify-center text-charcoal-muted transition-colors hover:text-charcoal"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* 단가 × 수량 합 */}
                  <span className="text-sm font-semibold text-primary-a11y tabular-nums">
                    {info ? formatKRW(info.price * item.quantity) : ' '}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* 요약 */}
      <aside className="rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 lg:sticky lg:top-24">
        <div className="flex items-center justify-between text-sm">
          <span className="text-charcoal-muted">{t('subtotal')}</span>
          <span className="font-bold text-primary-a11y tabular-nums">
            {loading && details.length === 0 ? '…' : formatKRW(subtotal)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-charcoal-soft">
          <span>{t('shipping')}</span>
          <span>{t('shippingEstimate')}</span>
        </div>

        {hasSoldOut ? (
          <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger-a11y">
            {t('soldOutNotice')}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button href="/checkout" variant="primary" disabled={hasSoldOut} className="w-full">
            {t('checkout')}
          </Button>
          <Button href="/artworks" variant="outline" className="w-full">
            {t('continueShopping')}
          </Button>
          <button
            type="button"
            onClick={handleClear}
            className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-lg text-sm font-medium text-charcoal-soft transition-colors hover:text-danger-a11y"
          >
            {t('clear')}
          </button>
        </div>
      </aside>
    </div>
  );
}
