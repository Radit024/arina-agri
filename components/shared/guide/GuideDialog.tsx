'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface GuideDialogProps {
  guide: GuideDefinition | null;
  open: boolean;
  onClose: () => void;
}

interface GuideStepCopy {
  title: string;
  body: string;
}

interface GuideCopy {
  eyebrow: string;
  title: string;
  intro: string;
  steps: Record<string, GuideStepCopy>;
}

interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ResolvedTarget {
  element: HTMLElement;
  target: string;
}

interface TargetState {
  targetKey: string;
  target: string;
  rect: SpotlightRect | null;
}

const SPOTLIGHT_PADDING = 6;
const CARD_GAP = 12;
const VIEWPORT_MARGIN = 14;
const ESTIMATED_CARD_HEIGHT = 228;
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

function getGuideTargetSelector(target: string) {
  return `[data-guide-target="${target.replace(/"/g, '\\"')}"]`;
}

function isVisibleGuideTarget(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  if (styles.display === 'none' || styles.visibility === 'hidden') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && process.env.NODE_ENV !== 'test') {
    return false;
  }

  return true;
}

function resolveGuideTarget(targets: string[]): ResolvedTarget | null {
  for (const target of targets) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(getGuideTargetSelector(target)));
    const visibleElement = elements.find(isVisibleGuideTarget);

    if (visibleElement) {
      return { element: visibleElement, target };
    }
  }

  return null;
}

function getSpotlightRect(element: HTMLElement): SpotlightRect {
  const rect = element.getBoundingClientRect();
  const viewport = getViewportSize();
  const width = Math.max(rect.width, 56);
  const height = Math.max(rect.height, 44);
  const left = clamp(rect.left - SPOTLIGHT_PADDING, VIEWPORT_MARGIN / 2, viewport.width - width - VIEWPORT_MARGIN / 2);
  const top = clamp(rect.top - SPOTLIGHT_PADDING, VIEWPORT_MARGIN / 2, viewport.height - height - VIEWPORT_MARGIN / 2);

  return {
    left,
    top,
    width: width + SPOTLIGHT_PADDING * 2,
    height: height + SPOTLIGHT_PADDING * 2,
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

function getPopoverPosition(rect: SpotlightRect | null, placement: GuidePlacement = 'bottom') {
  const viewport = getViewportSize();
  const cardWidth = Math.min(MAX_CARD_WIDTH, viewport.width - VIEWPORT_MARGIN * 2);
  const center = {
    left: (viewport.width - cardWidth) / 2,
    top: (viewport.height - ESTIMATED_CARD_HEIGHT) / 2,
  };

  if (!rect || placement === 'center') {
    return {
      left: clamp(center.left, VIEWPORT_MARGIN, viewport.width - cardWidth - VIEWPORT_MARGIN),
      top: clamp(center.top, VIEWPORT_MARGIN, viewport.height - ESTIMATED_CARD_HEIGHT - VIEWPORT_MARGIN),
      width: cardWidth,
    };
  }

  let left = rect.left + rect.width / 2 - cardWidth / 2;
  let top = rect.top + rect.height + CARD_GAP;

  if (placement === 'top') {
    top = rect.top - ESTIMATED_CARD_HEIGHT - CARD_GAP;
  }

  if (placement === 'left') {
    left = rect.left - cardWidth - CARD_GAP;
    top = rect.top + rect.height / 2 - ESTIMATED_CARD_HEIGHT / 2;
  }

  if (placement === 'right') {
    left = rect.left + rect.width + CARD_GAP;
    top = rect.top + rect.height / 2 - ESTIMATED_CARD_HEIGHT / 2;
  }

  if (top + ESTIMATED_CARD_HEIGHT > viewport.height - VIEWPORT_MARGIN) {
    top = rect.top - ESTIMATED_CARD_HEIGHT - CARD_GAP;
  }

  if (top < VIEWPORT_MARGIN) {
    top = rect.top + rect.height + CARD_GAP;
  }

  return {
    left: clamp(left, VIEWPORT_MARGIN, viewport.width - cardWidth - VIEWPORT_MARGIN),
    top: clamp(top, VIEWPORT_MARGIN, viewport.height - ESTIMATED_CARD_HEIGHT - VIEWPORT_MARGIN),
    width: cardWidth,
  };
}

export default function GuideDialog({ guide, open, onClose }: GuideDialogProps) {
  const t = useTranslations('Guide');
  const [activeStep, setActiveStep] = useState(0);
  const [targetState, setTargetState] = useState<TargetState | null>(null);

  const currentStep = guide?.steps[activeStep] ?? guide?.steps[0] ?? null;
  const stepTargets = useMemo(() => {
    if (!currentStep) return [];
    return Array.isArray(currentStep.target) ? currentStep.target : [currentStep.target];
  }, [currentStep]);
  const primaryTarget = stepTargets[0] ?? guide?.id ?? 'guide';
  const stepTargetKey = stepTargets.join('|');

  const refreshTarget = useCallback(() => {
    if (!open || stepTargets.length === 0) return;

    const target = resolveGuideTarget(stepTargets);
    if (!target) {
      setTargetState({ targetKey: stepTargetKey, target: primaryTarget, rect: null });
      return;
    }

    target.element.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
    setTargetState({
      targetKey: stepTargetKey,
      target: target.target,
      rect: getSpotlightRect(target.element),
    });
  }, [open, primaryTarget, stepTargetKey, stepTargets]);

  useEffect(() => {
    if (!open) return;

    const frameId = window.requestAnimationFrame?.(refreshTarget);
    const timeoutId = window.setTimeout(refreshTarget, 180);
    const resizeHandler = () => refreshTarget();

    window.addEventListener('resize', resizeHandler);
    window.addEventListener('scroll', resizeHandler, true);

    const observer = new MutationObserver(refreshTarget);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style', 'data-guide-target'],
    });

    return () => {
      if (frameId) window.cancelAnimationFrame?.(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler, true);
      observer.disconnect();
    };
  }, [open, refreshTarget]);

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
  const guideCopy = t.raw(guide.messageKey) as GuideCopy;
  const currentStepCopy = guideCopy.steps[currentStep.key];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;
  const progress = ((activeStep + 1) / totalSteps) * 100;
  const activeTargetState = targetState?.targetKey === stepTargetKey ? targetState : null;
  const targetRect = activeTargetState?.rect ?? null;
  const spotlightRect = targetRect ?? getFallbackSpotlightRect();
  const spotlightTarget = activeTargetState?.target ?? primaryTarget;
  const popoverPosition = getPopoverPosition(targetRect, currentStep.placement);

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
          data-testid="guide-spotlight"
          data-guide-target={spotlightTarget}
          sx={{
            position: 'fixed',
            left: spotlightRect.left,
            top: spotlightRect.top,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'success.main',
            boxShadow:
              '0 0 0 9999px rgba(15, 23, 42, 0.54), 0 0 0 4px rgba(34, 197, 94, 0.16), 0 10px 30px rgba(22, 163, 74, 0.24)',
            transition: 'left 180ms ease, top 180ms ease, width 180ms ease, height 180ms ease',
            pointerEvents: 'none',
          }}
        />

        <Paper
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-dialog-title"
          elevation={18}
          sx={{
            position: 'fixed',
            left: popoverPosition.left,
            top: popoverPosition.top,
            width: popoverPosition.width,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            backgroundImage: 'none',
            boxShadow: {
              xs: '0 18px 44px rgba(15, 23, 42, 0.24)',
              sm: '0 20px 54px rgba(15, 23, 42, 0.26)',
            },
            overflow: 'hidden',
            pointerEvents: 'auto',
            transition: 'left 180ms ease, top 180ms ease',
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
                label={guideCopy.eyebrow}
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
                {guideCopy.title}
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
                borderRadius: 1.5,
                px: 1.5,
                py: 1.15,
                bgcolor: 'rgba(22, 163, 74, 0.06)',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.4, lineHeight: 1.25 }}>
                {currentStepCopy.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, fontSize: '0.84rem' }}>
                {currentStepCopy.body}
              </Typography>
            </Box>

            <Box
              sx={{
                pt: 1.75,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
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
                  sx={{ borderRadius: 1.5, fontWeight: 800, textTransform: 'none' }}
                >
                  {t('actions.back')}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  endIcon={isLastStep ? undefined : <ChevronRightIcon />}
                  onClick={handleNext}
                  sx={{ borderRadius: 1.5, fontWeight: 900, textTransform: 'none', boxShadow: 'none' }}
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
