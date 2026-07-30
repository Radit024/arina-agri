'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import {
  GLOBAL_GUIDE,
  type GuideDefinition,
  type GuideId,
  getGuideDefinition,
  getGuideForPathname,
  isGuideSeen,
  markGuideSeen,
} from '@/components/shared/guide/guideConfig';
import { waitForGuideInitialTarget } from '@/components/shared/guide/guideTargets';

const GuideDialog = dynamic(() => import('@/components/shared/guide/GuideDialog'), {
  ssr: false,
});

interface GuideContextValue {
  openGuide: (guideId?: GuideId) => void;
}

const GuideContext = createContext<GuideContextValue>({
  openGuide: () => {},
});

export function useGuide() {
  return useContext(GuideContext);
}

function getAutoGuide(pathname: string) {
  if (typeof window === 'undefined') return null;

  const pageGuide = getGuideForPathname(pathname);
  if (pageGuide && !isGuideSeen(window.localStorage, pageGuide.id)) {
    return pageGuide;
  }

  if (pathname === '/dashboard' && !isGuideSeen(window.localStorage, GLOBAL_GUIDE.id)) {
    return GLOBAL_GUIDE;
  }

  return null;
}

export default function GuideProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<GuideDefinition | null>(null);
  const autoPromptedPathRef = useRef<string | null>(null);
  const pendingOpenRequestRef = useRef(0);

  const queueGuideOpen = useCallback((nextGuide: GuideDefinition) => {
    const requestId = pendingOpenRequestRef.current + 1;
    pendingOpenRequestRef.current = requestId;

    void waitForGuideInitialTarget(nextGuide, { timeoutMs: 4000 }).then((ready) => {
      if (pendingOpenRequestRef.current !== requestId || !ready) return;

      setActiveGuide(nextGuide);
      setIsOpen(true);
    });

    return () => {
      if (pendingOpenRequestRef.current === requestId) {
        pendingOpenRequestRef.current += 1;
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen || autoPromptedPathRef.current === pathname) return;

    const nextGuide = getAutoGuide(pathname);
    if (!nextGuide) return;

    autoPromptedPathRef.current = pathname;
    return queueGuideOpen(nextGuide);
  }, [isOpen, pathname, queueGuideOpen]);

  const openGuide = useCallback(
    (guideId?: GuideId) => {
      const requestedGuide = guideId ? getGuideDefinition(guideId) : null;
      const currentGuide = getGuideForPathname(pathname) ?? GLOBAL_GUIDE;
      const nextGuide = requestedGuide ?? currentGuide;

      if (!nextGuide) return;

      queueGuideOpen(nextGuide);
    },
    [pathname, queueGuideOpen]
  );

  const closeGuide = useCallback(() => {
    pendingOpenRequestRef.current += 1;

    if (activeGuide && typeof window !== 'undefined') {
      markGuideSeen(window.localStorage, activeGuide.id);
    }

    setIsOpen(false);
  }, [activeGuide]);

  useEffect(() => {
    return () => {
      pendingOpenRequestRef.current += 1;
    };
  }, []);

  const contextValue = useMemo(() => ({ openGuide }), [openGuide]);

  return (
    <GuideContext.Provider value={contextValue}>
      {children}
      {isOpen && <GuideDialog key={activeGuide?.id ?? 'guide'} guide={activeGuide} open={isOpen} onClose={closeGuide} />}
    </GuideContext.Provider>
  );
}
