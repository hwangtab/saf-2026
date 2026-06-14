'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { useCart } from '@/components/providers/CartProvider';
import { getCartArtworks, type CartArtworkInfo } from '@/app/actions/cart-artworks';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';
import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/ui/Button';

// Modal과 동일한 scroll-lock 카운터 패턴 — 다른 오버레이와 공존 시 overflow 조기 복원 방지.
let activeDrawerCount = 0;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function formatKRW(value: number): string {
  return `₩${value.toLocaleString('ko-KR')}`;
}

export default function CartDrawer() {
  const t = useTranslations('cart');
  const tA11y = useTranslations('a11y');
  const { items, isOpen, closeDrawer, setQuantity, remove, mounted } = useCart();

  const [details, setDetails] = useState<CartArtworkInfo[]>([]);
  // 초기 true — 첫 fetch 완료 전 항목이 잠깐 '품절/없음'으로 깜빡이는 것 방지(missing 판정 억제).
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // 상세 로드 — 열려 있고 항목이 있을 때 artworkId로 조회. items 변경 시 재조회.
  const itemIds = items.map((i) => i.artworkId);
  const idsKey = itemIds.join(',');

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, idsKey]);

  // Body scroll lock (카운터 기반)
  useEffect(() => {
    if (!isOpen) return;
    activeDrawerCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      activeDrawerCount -= 1;
      if (activeDrawerCount === 0) {
        document.body.style.overflow = 'unset';
      }
    };
  }, [isOpen]);

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeDrawer]);

  // 포커스 트랩 + 초기 포커스 + 복원
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;

    const initial = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    initial?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last?.focus();
          e.preventDefault();
        }
      } else if (document.activeElement === last) {
        first?.focus();
        e.preventDefault();
      }
    };

    panel.addEventListener('keydown', handleTab);
    return () => {
      panel.removeEventListener('keydown', handleTab);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  const detailById = useCallback(
    (id: string) => details.find((d) => d.id === id) ?? null,
    [details]
  );

  if (!mounted || !isOpen) return null;

  const hasItems = items.length > 0;
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
  const hasSoldOut = hasItems && items.some((item) => isUnavailable(item.artworkId));

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal-deep/40 motion-safe:animate-fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('drawerTitle')}
        className={clsx(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-canvas-soft shadow-xl',
          'motion-safe:animate-slide-in-right motion-reduce:transform-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gallery-hairline px-5 py-4">
          <h2 className="text-lg font-bold text-charcoal-deep">{t('drawerTitle')}</h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label={tA11y('close')}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-charcoal-muted transition-colors hover:bg-gray-100 hover:text-charcoal"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        {!hasItems ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-base font-semibold text-charcoal-deep">{t('empty')}</p>
            <p className="text-sm text-charcoal-muted">{t('emptyHint')}</p>
            <Button href="/artworks" variant="primary" onClick={closeDrawer} className="mt-2">
              {t('browseArtworks')}
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gallery-divider overflow-y-auto overscroll-contain">
              {items.map((item) => {
                const info = detailById(item.artworkId);
                const soldOut = isUnavailable(item.artworkId);
                const isUnique = info?.editionType === 'unique';
                const imageSrc = info?.image ? resolveArtworkImageUrl(info.image) : '';

                return (
                  <li
                    key={item.artworkId}
                    className={clsx('flex gap-3 p-4', soldOut && 'opacity-70')}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gallery-hairline bg-canvas-strong">
                      {imageSrc ? (
                        <SafeImage
                          src={imageSrc}
                          alt={info?.title ?? ''}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-canvas-strong" aria-hidden="true" />
                      )}
                    </div>

                    {/* Info + controls */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-artwork-title truncate text-sm text-charcoal-deep">
                            {info?.title || (soldOut ? t('unavailableTitle') : ' ')}
                          </p>
                          {info?.artistName ? (
                            <p className="text-caption-meta truncate">{info.artistName}</p>
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

                      {soldOut ? (
                        <span className="mt-1 inline-flex w-fit items-center rounded bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger-a11y">
                          {t('soldOut')}
                        </span>
                      ) : null}

                      <div className="mt-auto flex items-end justify-between pt-2">
                        {/* Quantity stepper */}
                        {isUnique ? (
                          <span
                            className="text-xs text-charcoal-muted"
                            title={t('uniqueQtyLocked')}
                          >
                            {t('uniqueQtyLocked')}
                          </span>
                        ) : (
                          <div className="inline-flex items-center rounded-md border border-gallery-hairline">
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(item.artworkId, Math.max(1, item.quantity - 1))
                              }
                              disabled={item.quantity <= 1}
                              aria-label={t('decrease')}
                              className="inline-flex h-8 w-8 items-center justify-center text-charcoal-muted transition-colors hover:text-charcoal disabled:opacity-40"
                            >
                              −
                            </button>
                            <span
                              className="min-w-[2rem] text-center text-sm tabular-nums text-charcoal-deep"
                              aria-label={t('quantity')}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(item.artworkId, item.quantity + 1)}
                              aria-label={t('increase')}
                              className="inline-flex h-8 w-8 items-center justify-center text-charcoal-muted transition-colors hover:text-charcoal"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {/* Unit price */}
                        <span className="text-sm font-semibold text-primary-a11y tabular-nums">
                          {info ? formatKRW(info.price) : ' '}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footer summary + CTAs */}
            <div className="border-t border-gallery-hairline bg-canvas-soft px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal-muted">{t('subtotal')}</span>
                <span className="font-bold text-primary-a11y tabular-nums">
                  {loading && details.length === 0 ? '…' : formatKRW(subtotal)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-charcoal-soft">
                <span>{t('shipping')}</span>
                <span>{t('shippingEstimate')}</span>
              </div>

              {hasSoldOut ? (
                <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger-a11y">
                  {t('soldOutNotice')}
                </p>
              ) : null}

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  href="/checkout"
                  variant="primary"
                  onClick={closeDrawer}
                  disabled={hasSoldOut}
                  className="w-full"
                >
                  {t('checkout')}
                </Button>
                <Button href="/cart" variant="outline" onClick={closeDrawer} className="w-full">
                  {t('viewCart')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
