import type { GuideDefinition, GuideStepDefinition } from '@/components/shared/guide/guideConfig';

interface WaitForGuideTargetOptions {
  settleFrames?: number;
  timeoutMs?: number;
}

export interface ResolvedGuideTarget {
  element: HTMLElement;
  target: string;
}

interface GuideFrameHandle {
  rafId: number | null;
  timeoutId: number | null;
}

const DEFAULT_READY_TIMEOUT_MS = 1200;
const DEFAULT_SETTLE_FRAMES = 2;
const READY_CHECK_INTERVAL_MS = 80;

export function getGuideStepTargets(step: GuideStepDefinition | null | undefined) {
  if (!step) return [];
  return Array.isArray(step.target) ? step.target : [step.target];
}

export function getGuideTargetSelector(target: string) {
  return `[data-guide-target="${target.replace(/"/g, '\\"')}"]`;
}

export function isVisibleGuideTarget(element: HTMLElement) {
  if (typeof window === 'undefined') return false;

  const styles = window.getComputedStyle(element);
  if (styles.display === 'none' || styles.visibility === 'hidden') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && process.env.NODE_ENV !== 'test') {
    return false;
  }

  return true;
}

export function isReadyGuideTarget(element: HTMLElement) {
  if (!isVisibleGuideTarget(element)) return false;
  if (process.env.NODE_ENV === 'test') return true;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function resolveGuideTarget(targets: readonly string[]): ResolvedGuideTarget | null {
  for (const target of targets) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(getGuideTargetSelector(target)));
    const visibleElement = elements.find((element) => element.getAttribute('data-testid') !== 'guide-spotlight' && isVisibleGuideTarget(element));

    if (visibleElement) {
      return { element: visibleElement, target };
    }
  }

  return null;
}

function getInitialGuideTargets(guide: GuideDefinition) {
  return getGuideStepTargets(guide.steps[0]);
}

function requestGuideFrame(callback: FrameRequestCallback): GuideFrameHandle {
  const handle: GuideFrameHandle = {
    rafId: null,
    timeoutId: null,
  };
  let completed = false;

  const run = (time: number) => {
    if (completed) return;
    completed = true;

    if (handle.rafId !== null && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(handle.rafId);
      handle.rafId = null;
    }

    if (handle.timeoutId !== null) {
      window.clearTimeout(handle.timeoutId);
      handle.timeoutId = null;
    }

    callback(time);
  };

  if (typeof window.requestAnimationFrame === 'function') {
    handle.rafId = window.requestAnimationFrame(run);
  }

  handle.timeoutId = window.setTimeout(() => run(performance.now()), 32);
  return handle;
}

function cancelGuideFrame(handle: GuideFrameHandle) {
  if (handle.rafId !== null && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(handle.rafId);
    handle.rafId = null;
  }

  if (handle.timeoutId !== null) {
    window.clearTimeout(handle.timeoutId);
    handle.timeoutId = null;
  }
}

export function waitForGuideInitialTarget(guide: GuideDefinition, options: WaitForGuideTargetOptions = {}) {
  const targets = getInitialGuideTargets(guide);
  if (typeof window === 'undefined' || targets.length === 0) {
    return Promise.resolve(true);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
  const settleFrames = options.settleFrames ?? DEFAULT_SETTLE_FRAMES;

  return new Promise<boolean>((resolve) => {
    let frameHandle: GuideFrameHandle | null = null;
    let intervalId: number | null = null;
    let timeoutId: number | null = null;
    let observer: MutationObserver | null = null;
    let resolved = false;
    let settling = false;

    const cleanup = () => {
      resolved = true;

      if (frameHandle !== null) {
        cancelGuideFrame(frameHandle);
        frameHandle = null;
      }

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      window.removeEventListener('resize', check);
      observer?.disconnect();
      observer = null;
    };

    const finish = (ready: boolean) => {
      if (resolved) return;
      cleanup();
      resolve(ready);
    };

    const waitForStableFrames = (remainingFrames: number) => {
      frameHandle = requestGuideFrame(() => {
        frameHandle = null;

        const target = resolveGuideTarget(targets);
        if (!target || !isReadyGuideTarget(target.element)) {
          settling = false;
          check();
          return;
        }

        if (remainingFrames <= 1) {
          finish(true);
          return;
        }

        waitForStableFrames(remainingFrames - 1);
      });
    };

    function check() {
      if (resolved || settling) return;

      const target = resolveGuideTarget(targets);
      if (!target || !isReadyGuideTarget(target.element)) return;

      settling = true;
      waitForStableFrames(Math.max(1, settleFrames));
    }

    timeoutId = window.setTimeout(() => finish(false), timeoutMs);
    intervalId = window.setInterval(check, READY_CHECK_INTERVAL_MS);
    window.addEventListener('resize', check, { passive: true });

    observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(check)
        : null;

    observer?.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style', 'data-guide-target'],
    });

    check();
  });
}
