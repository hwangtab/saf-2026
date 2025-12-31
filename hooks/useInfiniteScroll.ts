import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  initialCount?: number;
  batchSize?: number;
  threshold?: number;
}

export function useInfiniteScroll<T>(data: T[], options: UseInfiniteScrollOptions = {}) {
  const { initialCount = 20, batchSize = 20, threshold = 0.5 } = options;
  const [displayCount, setDisplayCount] = useState(initialCount);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset display count when data changes (e.g. filtering)
  useEffect(() => {
    setDisplayCount(initialCount);
  }, [data, initialCount]);

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => Math.min(prev + batchSize, data.length));
  }, [batchSize, data.length]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || displayCount >= data.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [displayCount, data.length, threshold, loadMore]);

  const visibleData = data.slice(0, displayCount);
  const hasMore = displayCount < data.length;

  return {
    visibleData,
    observerTarget,
    hasMore,
  };
}
