'use client';

import { useCallback, useRef, useState, type TouchEvent } from 'react';

interface UsePullToRefreshOptions {
  enabled: boolean;
  onRefresh: () => Promise<void>;
}

export function usePullToRefresh({ enabled, onRefresh }: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!enabled || isRefreshing) return;
      const scrollTop = document.scrollingElement?.scrollTop ?? 0;
      if (scrollTop > 0) return;
      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
    },
    [enabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!pullingRef.current || !enabled || isRefreshing) return;
      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      event.preventDefault();
      setPullDistance(Math.min(delta, 80));
    },
    [enabled, isRefreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    const shouldRefresh = pullDistance >= 60;
    setPullDistance(0);
    if (shouldRefresh) {
      void handleRefresh();
    }
  }, [pullDistance, handleRefresh]);

  return {
    contentTransform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'translateY(0px)',
    isRefreshing,
    pullDistance,
    touchHandlers: {
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
      onTouchStart: handleTouchStart,
    },
  };
}
