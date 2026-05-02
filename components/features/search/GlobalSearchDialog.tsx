'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Z_INDEX } from '@/lib/constants';
import SearchResultItem from './SearchResultItem';
import ArtistResultItem from './ArtistResultItem';
import styles from './GlobalSearchDialog.module.css';

interface GlobalSearchDialogProps {
  isOpen: boolean;
  query: string;
  results: {
    artworks: import('@/app/api/search/route').SearchResultArtwork[];
    artists: import('@/app/api/search/route').SearchResultArtist[];
    totalArtworkMatches: number;
    query: string;
  } | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onQueryChange: (query: string) => void;
}

export default function GlobalSearchDialog({
  isOpen,
  query,
  results,
  isLoading,
  error,
  onClose,
  onQueryChange,
}: GlobalSearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollYRef = useRef(0);
  const isBodyLockedRef = useRef(false);
  const router = useRouter();
  const t = useTranslations('globalSearch');

  // body 스크롤 복원
  const restoreBodyScroll = useCallback(() => {
    if (!isBodyLockedRef.current) return;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollYRef.current);
    isBodyLockedRef.current = false;
  }, []);

  // 다이얼로그 열기/닫기
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      isBodyLockedRef.current = true;
      // 입력 필드 포커스
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      if (dialog.open) dialog.close();
      restoreBodyScroll();
    }

    return () => {
      restoreBodyScroll();
    };
  }, [isOpen, restoreBodyScroll]);

  const handleDialogClose = () => {
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      onClose();
      router.push(`/artworks?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleViewAll = () => {
    onClose();
    router.push(`/artworks?q=${encodeURIComponent(query.trim())}`);
  };

  const hasResults = results && (results.artworks.length > 0 || results.artists.length > 0);
  const showEmpty = !isLoading && query.trim() && results && !hasResults;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop 클릭 닫기; Escape는 dialog onClose가 처리
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      style={{ zIndex: Z_INDEX.SEARCH_DIALOG }}
      aria-label={t('dialogLabel')}
    >
      <div className="flex flex-col h-full max-h-[inherit]">
        {/* 검색 입력 영역 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          {/* 검색 아이콘 */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-charcoal-muted flex-shrink-0"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            className="flex-1 text-base text-charcoal placeholder:text-gray-400 bg-transparent outline-none min-w-0"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          {/* 로딩 스피너 / 클리어 버튼 */}
          {isLoading ? (
            <div
              className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0"
              aria-label={t('searching')}
            />
          ) : query ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-charcoal transition-colors rounded"
              aria-label={t('clear')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          ) : (
            <span className="hidden sm:block flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
              ESC
            </span>
          )}

          {/* 닫기 버튼 (모바일) */}
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden flex-shrink-0 text-sm text-charcoal-muted hover:text-charcoal transition-colors px-2 py-1"
          >
            {t('close')}
          </button>
        </div>

        {/* 결과 영역 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* 빈 상태 - 초기 */}
          {!query && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-charcoal-muted">{t('initialHint')}</p>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-danger">{t('error')}</p>
            </div>
          )}

          {/* 검색 결과 없음 */}
          {showEmpty && !error && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm font-medium text-charcoal">{t('noResults')}</p>
              <p className="text-xs text-charcoal-muted mt-1">{t('noResultsDesc')}</p>
            </div>
          )}

          {/* 결과 목록 */}
          {hasResults && (
            <div className="py-2">
              {/* 작가 섹션 */}
              {results.artists.length > 0 && (
                <section>
                  <p className="px-4 py-2 text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
                    {t('artistsSection')}
                  </p>
                  <ul>
                    {results.artists.map((artist) => (
                      <li key={artist.name}>
                        <ArtistResultItem artist={artist} onSelect={onClose} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 작품 섹션 */}
              {results.artworks.length > 0 && (
                <section className={results.artists.length > 0 ? 'mt-2' : ''}>
                  <p className="px-4 py-2 text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
                    {t('artworksSection')}
                  </p>
                  <ul>
                    {results.artworks.map((artwork) => (
                      <li key={artwork.id}>
                        <SearchResultItem artwork={artwork} onSelect={onClose} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 전체 결과 보기 */}
              {results.totalArtworkMatches > results.artworks.length && (
                <div className="px-4 pt-2 pb-3 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={handleViewAll}
                    className="w-full text-sm text-primary hover:text-primary/80 font-medium py-2 px-4 rounded-lg hover:bg-primary-surface transition-colors text-left"
                  >
                    {t('viewAll', { count: results.totalArtworkMatches })}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
