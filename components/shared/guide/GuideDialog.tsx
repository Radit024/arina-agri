'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Portal from '@mui/material/Portal';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslations } from 'next-intl';
import type { GuideDefinition, GuidePlacement } from '@/components/shared/guide/guideConfig';
import { getGuideStepTargets, resolveGuideTarget } from '@/components/shared/guide/guideTargets';

interface GuideDialogProps {
  guide: GuideDefinition | null;
  open: boolean;
  onClose: () => void;
}

interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TargetState {
  targetKey: string;
  target: string;
  rect: SpotlightRect | null;
}

interface PopoverPosition {
  left: number;
  top: number;
  translateY?: '-100%';
  width: number;
  zone: 'bottom' | 'center' | 'side' | 'top';
}

interface RefreshTargetOptions {
  scroll?: boolean;
}

const SPOTLIGHT_PADDING = 6;
const CARD_GAP = 16;
const VIEWPORT_MARGIN = 20;
const ESTIMATED_CARD_HEIGHT = 260;
const MAX_CARD_WIDTH = 348;

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 };
  }

  return {
    width: window.innerWidth || document.documentElement.clientWidth || 1024,
    height: window.innerHeight || document.documentElement.clientHeight || 768,
  };
}

function isMobileGuideViewport() {
  if (typeof window === 'undefined') return false;

  return window.matchMedia?.('(max-width: 899.95px)').matches ?? window.innerWidth < 900;
}

function getSpotlightRect(element: HTMLElement): SpotlightRect {
  const rect = element.getBoundingClientRect();
  const viewport = getViewportSize();
  const width = Math.min(Math.max(rect.width, 56) + SPOTLIGHT_PADDING * 2, Math.max(56, viewport.width - VIEWPORT_MARGIN));
  const height = Math.min(Math.max(rect.height, 44) + SPOTLIGHT_PADDING * 2, Math.max(44, viewport.height - VIEWPORT_MARGIN));
  const left = clamp(rect.left - SPOTLIGHT_PADDING, VIEWPORT_MARGIN / 2, viewport.width - width - VIEWPORT_MARGIN / 2);
  const top = clamp(rect.top - SPOTLIGHT_PADDING, VIEWPORT_MARGIN / 2, viewport.height - height - VIEWPORT_MARGIN / 2);

  return {
    left,
    top,
    width,
    height,
  };
}

function getFallbackSpotlightRect(): SpotlightRect {
  const viewport = getViewportSize();
  const width = Math.min(320, viewport.width - VIEWPORT_MARGIN * 2);
  const height = 96;

  return {
    left: (viewport.width - width) / 2,
    top: Math.max(96, (viewport.height - height) / 3),
    width,
    height,
  };
}

function getMobilePopoverPosition(rect: SpotlightRect | null, cardWidth: number, cardHeight: number): PopoverPosition {
  const viewport = getViewportSize();
  const resolvedCardHeight = Math.min(cardHeight, viewport.height - VIEWPORT_MARGIN * 2);
  const left = clamp((viewport.width - cardWidth) / 2, VIEWPORT_MARGIN, viewport.width - cardWidth - VIEWPORT_MARGIN);

  if (!rect) {
    return {
      left,
      top: clamp((viewport.height - resolvedCardHeight) / 2, VIEWPORT_MARGIN, viewport.height - resolvedCardHeight - VIEWPORT_MARGIN),
      width: cardWidth,
      zone: 'center',
    };
  }

  const spaceAbove = rect.top - VIEWPORT_MARGIN - CARD_GAP;
  const spaceBelow = viewport.height - (rect.top + rect.height) - VIEWPORT_MARGIN - CARD_GAP;
  const shouldPlaceBelow = spaceBelow >= resolvedCardHeight || spaceBelow >= spaceAbove;
  if (shouldPlaceBelow) {
    return {
      left,
      top: clamp(rect.top + rect.height + CARD_GAP, VIEWPORT_MARGIN, viewport.height - resolvedCardHeight - VIEWPORT_MARGIN),
      width: cardWidth,
      zone: 'bottom',
    };
  }

  return {
    left,
    top: clamp(rect.top - CARD_GAP, VIEWPORT_MARGIN + resolvedCardHeight, viewport.height - VIEWPORT_MARGIN),
    translateY: '-100%',
    width: cardWidth,
    zone: 'top',
  };
}

function getPopoverPosition(
  rect: SpotlightRect | null,
  placement: GuidePlacement = 'bottom',
  cardHeight = ESTIMATED_CARD_HEIGHT,
): PopoverPosition {
  const viewport = getViewportSize();
  const cardWidth = Math.min(MAX_CARD_WIDTH, viewport.width - VIEWPORT_MARGIN * 2);
  const resolvedCardHeight = Math.min(cardHeight, viewport.height - VIEWPORT_MARGIN * 2);

  if (isMobileGuideViewport()) {
    return getMobilePopoverPosition(rect, cardWidth, resolvedCardHeight);
  }

  const center = {
    left: (viewport.width - cardWidth) / 2,
    top: (viewport.height - resolvedCardHeight) / 2,
  };

  if (!rect || placement === 'center') {
    return {
      left: clamp(center.left, VIEWPORT_MARGIN, viewport.width - cardWidth - VIEWPORT_MARGIN),
      top: clamp(center.top, VIEWPORT_MARGIN, viewport.height - resolvedCardHeight - VIEWPORT_MARGIN),
      width: cardWidth,
      zone: 'center',
    };
  }

  let left = rect.left + rect.width / 2 - cardWidth / 2;
  let top = rect.top + rect.height + CARD_GAP;
  let zone: PopoverPosition['zone'] = 'bottom';

  if (placement === 'top') {
    top = rect.top - resolvedCardHeight - CARD_GAP;
    zone = 'top';
  }

  if (placement === 'left') {
    left = rect.left - cardWidth - CARD_GAP;
    top = rect.top + rect.height / 2 - resolvedCardHeight / 2;
    zone = 'side';
  }

  if (placement === 'right') {
    left = rect.left + rect.width + CARD_GAP;
    top = rect.top + rect.height / 2 - resolvedCardHeight / 2;
    zone = 'side';
  }

  if (top + resolvedCardHeight > viewport.height - VIEWPORT_MARGIN) {
    top = rect.top - resolvedCardHeight - CARD_GAP;
    zone = 'top';
  }

  if (top < VIEWPORT_MARGIN) {
    top = rect.top + rect.height + CARD_GAP;
    zone = 'bottom';
  }

  return {
    left: clamp(left, VIEWPORT_MARGIN, viewport.width - cardWidth - VIEWPORT_MARGIN),
    top: clamp(top, VIEWPORT_MARGIN, viewport.height - resolvedCardHeight - VIEWPORT_MARGIN),
    width: cardWidth,
    zone,
  };
}

function areSpotlightRectsEqual(first: SpotlightRect | null, second: SpotlightRect | null) {
  if (!first || !second) return first === second;

  return (
    Math.abs(first.left - second.left) < 0.5 &&
    Math.abs(first.top - second.top) < 0.5 &&
    Math.abs(first.width - second.width) < 0.5 &&
    Math.abs(first.height - second.height) < 0.5
  );
}

function areTargetStatesEqual(first: TargetState | null, second: TargetState) {
  return first?.targetKey === second.targetKey && first.target === second.target && areSpotlightRectsEqual(first.rect, second.rect);
}

export default function GuideDialog({ guide, open, onClose }: GuideDialogProps) {
  const t = useTranslations('Guide');
  const [activeStep, setActiveStep] = useState(0);
  const [targetState, setTargetState] = useState<TargetState | null>(null);
  const [popoverHeight, setPopoverHeight] = useState(ESTIMATED_CARD_HEIGHT);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const rafFallbackRefreshRef = useRef<number | null>(null);
  const rafRefreshRef = useRef<number | null>(null);

  const currentStep = guide?.steps[activeStep] ?? guide?.steps[0] ?? null;
  const stepTargets = useMemo(() => {
    return getGuideStepTargets(currentStep);
  }, [currentStep]);
  const primaryTarget = stepTargets[0] ?? guide?.id ?? 'guide';
  const stepTargetKey = stepTargets.join('|');

  const commitTargetState = useCallback((nextState: TargetState) => {
    setTargetState((currentState) => (areTargetStatesEqual(currentState, nextState) ? currentState : nextState));
  }, []);

  const refreshTarget = useCallback((options: RefreshTargetOptions = {}) => {
    if (!open || stepTargets.length === 0) return;

    const target = resolveGuideTarget(stepTargets);
    if (!target) {
      commitTargetState({ targetKey: stepTargetKey, target: primaryTarget, rect: null });
      return;
    }

    if (options.scroll) {
      target.element.scrollIntoView?.({
        block: 'center',
        inline: 'center',
        behavior: isMobileGuideViewport() ? 'auto' : 'smooth',
      });
    }

    commitTargetState({
      targetKey: stepTargetKey,
      target: target.target,
      rect: getSpotlightRect(target.element),
    });
  }, [commitTargetState, open, primaryTarget, stepTargetKey, stepTargets]);

  const scheduleRefreshTarget = useCallback(
    (options: RefreshTargetOptions = {}) => {
      if (rafRefreshRef.current !== null || rafFallbackRefreshRef.current !== null) return;

      const runRefresh = () => {
        if (rafRefreshRef.current !== null) {
          window.cancelAnimationFrame(rafRefreshRef.current);
          rafRefreshRef.current = null;
        }
        if (rafFallbackRefreshRef.current !== null) {
          window.clearTimeout(rafFallbackRefreshRef.current);
          rafFallbackRefreshRef.current = null;
        }
        refreshTarget(options);
      };

      rafRefreshRef.current = window.requestAnimationFrame(runRefresh);
      rafFallbackRefreshRef.current = window.setTimeout(runRefresh, 80);
    },
    [refreshTarget]
  );

  useLayoutEffect(() => {
    if (!open) return;

    refreshTarget({ scroll: true });
  }, [open, refreshTarget]);

  useEffect(() => {
    if (!open) return;

    const timeoutIds = [
      window.setTimeout(() => scheduleRefreshTarget({ scroll: true }), 180),
      window.setTimeout(() => scheduleRefreshTarget({ scroll: true }), 420),
      window.setTimeout(() => scheduleRefreshTarget(), 760),
    ];
    const resizeHandler = () => scheduleRefreshTarget();

    scheduleRefreshTarget({ scroll: true });

    window.addEventListener('resize', resizeHandler, { passive: true });
    window.addEventListener('scroll', resizeHandler, { capture: true, passive: true });

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => scheduleRefreshTarget())
        : null;

    observer?.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style', 'data-guide-target'],
    });

    return () => {
      if (rafRefreshRef.current !== null) {
        window.cancelAnimationFrame(rafRefreshRef.current);
        rafRefreshRef.current = null;
      }
      if (rafFallbackRefreshRef.current !== null) {
        window.clearTimeout(rafFallbackRefreshRef.current);
        rafFallbackRefreshRef.current = null;
      }
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler, true);
      observer?.disconnect();
    };
  }, [open, scheduleRefreshTarget]);

  useEffect(() => {
    if (!open || !targetState?.rect || targetState.targetKey !== stepTargetKey || typeof ResizeObserver === 'undefined') return;

    const target = resolveGuideTarget(stepTargets);
    if (!target) return;

    const observer = new ResizeObserver(() => scheduleRefreshTarget());
    observer.observe(target.element);

    return () => observer.disconnect();
  }, [open, scheduleRefreshTarget, stepTargetKey, stepTargets, targetState]);

  useLayoutEffect(() => {
    if (!open) return;

    const popover = popoverRef.current;
    if (!popover) return;

    const updatePopoverHeight = () => {
      const nextHeight = popover.getBoundingClientRect().height;
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;

      setPopoverHeight((currentHeight) => {
        if (Math.abs(currentHeight - nextHeight) < 1) return currentHeight;
        return nextHeight;
      });
      scheduleRefreshTarget();
    };

    updatePopoverHeight();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updatePopoverHeight)
        : null;

    observer?.observe(popover);

    return () => observer?.disconnect();
  }, [activeStep, open, scheduleRefreshTarget]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!guide || !currentStep || !open) return null;

  const totalSteps = guide.steps.length;
  const mk = String(guide.messageKey);
  const eyebrow = t(mk + '.eyebrow');
  const title = t(mk + '.title');
  const stepTitle = t(mk + '.steps.' + currentStep.key + '.title');
  const stepBody = t(mk + '.steps.' + currentStep.key + '.body');
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;
  const progress = ((activeStep + 1) / totalSteps) * 100;
  const activeTargetState = targetState?.targetKey === stepTargetKey ? targetState : null;
  const targetRect = activeTargetState?.rect ?? null;
  const spotlightRect = targetRect ?? getFallbackSpotlightRect();
  const spotlightTarget = activeTargetState?.target ?? primaryTarget;
  const popoverPosition = getPopoverPosition(targetRect, currentStep.placement, popoverHeight);
  const spotlightRight = spotlightRect.left + spotlightRect.width;
  const spotlightBottom = spotlightRect.top + spotlightRect.height;
  const backdropColor = 'rgba(15, 23, 42, 0.54)';

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      return;
    }

    setActiveStep((step) => Math.min(step + 1, totalSteps - 1));
  };

  return (
    <Portal>
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 1500, pointerEvents: 'none' }}>
        <Box aria-hidden sx={{ position: 'fixed', inset: 0, pointerEvents: 'auto' }} />
        <Box
          aria-hidden
          sx={{ position: 'fixed', left: 0, top: 0, right: 0, height: spotlightRect.top, bgcolor: backdropColor }}
        />
        <Box
          aria-hidden
          sx={{ position: 'fixed', left: 0, top: spotlightBottom, right: 0, bottom: 0, bgcolor: backdropColor }}
        />
        <Box
          aria-hidden
          sx={{ position: 'fixed', left: 0, top: spotlightRect.top, width: spotlightRect.left, height: spotlightRect.height, bgcolor: backdropColor }}
        />
        <Box
          aria-hidden
          sx={{ position: 'fixed', left: spotlightRight, top: spotlightRect.top, right: 0, height: spotlightRect.height, bgcolor: backdropColor }}
        />

        <Box
          aria-hidden
          data-testid="guide-spotlight"
          data-guide-target={spotlightTarget}
          data-guide-spotlight-left={Math.round(spotlightRect.left)}
          data-guide-spotlight-top={Math.round(spotlightRect.top)}
          data-guide-spotlight-width={Math.round(spotlightRect.width)}
          data-guide-spotlight-height={Math.round(spotlightRect.height)}
          sx={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: spotlightRect.width,
            height: spotlightRect.height,
            transform: `translate3d(${spotlightRect.left}px, ${spotlightRect.top}px, 0)`,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'success.main',
            boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.16), 0 10px 30px rgba(22, 163, 74, 0.18)',
            contain: 'layout paint style',
            transition: 'transform 180ms ease, width 180ms ease, height 180ms ease',
            willChange: 'transform, width, height',
            pointerEvents: 'none',
          }}
        />

        <Paper
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-dialog-title"
          data-guide-placement-zone={popoverPosition.zone}
          elevation={18}
          sx={{
            position: 'fixed',
            left: 0,
            top: 0,
            transform: `translate3d(${popoverPosition.left}px, ${popoverPosition.top}px, 0)${popoverPosition.translateY ? ` translateY(${popoverPosition.translateY})` : ''}`,
            width: popoverPosition.width,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: '24px',
            border: '1px solid',
            borderColor: 'divider',
            backgroundImage: 'none',
            boxShadow: {
              xs: '0 18px 44px rgba(15, 23, 42, 0.24)',
              sm: '0 20px 54px rgba(15, 23, 42, 0.26)',
            },
            contain: 'layout paint style',
            maxHeight: { xs: 'min(52dvh, 340px)', sm: 'none' },
            overflowX: 'hidden',
            overflowY: { xs: 'auto', sm: 'hidden' },
            pointerEvents: 'auto',
            transition: 'transform 180ms ease',
            willChange: 'transform',
          }}
        >
          <Box
            sx={{
              px: 2,
              pt: 1.75,
              pb: 0.75,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Stack spacing={0.45}>
              <Chip
                label={eyebrow}
                size="small"
                sx={{
                  alignSelf: 'flex-start',
                  height: 22,
                  borderRadius: 999,
                  bgcolor: 'rgba(22, 163, 74, 0.12)',
                  color: 'success.dark',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
              <Typography
                id="guide-dialog-title"
                component="h2"
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 800, lineHeight: 1.25 }}
              >
                {title}
              </Typography>
            </Stack>

            <IconButton
              aria-label={t('actions.close')}
              onClick={onClose}
              size="small"
              sx={{ bgcolor: 'action.hover', color: 'text.secondary', '&:hover': { bgcolor: 'action.selected' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ px: 2, pb: 2 }}>
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, fontSize: '0.68rem' }}>
                  {t('stepProgress', { current: activeStep + 1, total: totalSteps })}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'success.dark',
                    fontWeight: 900,
                    bgcolor: 'rgba(22, 163, 74, 0.1)',
                    borderRadius: 999,
                    px: 0.8,
                    py: 0.15,
                    lineHeight: 1.4,
                  }}
                >
                  {activeStep + 1}/{totalSteps}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 4,
                  borderRadius: 999,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    bgcolor: 'success.main',
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                borderLeft: '3px solid',
                borderColor: 'success.main',
                borderRadius: '8px',
                px: 1.5,
                py: 1.15,
                bgcolor: 'rgba(22, 163, 74, 0.06)',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.4, lineHeight: 1.25 }}>
                {stepTitle}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.84rem' }}>
                {stepBody}
              </Typography>
            </Box>

            <Box
              sx={{
                pt: 1.75,
                pb: 0.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                rowGap: 1.25,
                flexWrap: 'wrap',
              }}
            >
              <Button
                onClick={onClose}
                color="inherit"
                size="small"
                sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}
              >
                {t('actions.skip')}
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ChevronLeftIcon />}
                  onClick={() => setActiveStep((step) => Math.max(step - 1, 0))}
                  disabled={isFirstStep}
                  sx={{ borderRadius: '8px', fontWeight: 800, textTransform: 'none' }}
                >
                  {t('actions.back')}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  endIcon={isLastStep ? undefined : <ChevronRightIcon />}
                  onClick={handleNext}
                  sx={{ borderRadius: '8px', fontWeight: 900, textTransform: 'none', boxShadow: 'none' }}
                >
                  {isLastStep ? t('actions.finish') : t('actions.next')}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Portal>
  );
}
