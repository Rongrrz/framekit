import { createDesktopApp } from './desktop/app';
import { createMobileApp } from './mobile/app';

const mobileBreakpoint = 720;

const forcedPreview = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

const useMobileLayout =
  forcedPreview === 'mobile' ||
  (forcedPreview !== 'desktop' && window.innerWidth < mobileBreakpoint);

const playground = useMobileLayout ? createMobileApp() : createDesktopApp();
playground.mount('#root');

const listenerController = new AbortController();
window.addEventListener(
  'resize',
  () => {
    const crossedLayoutBreakpoint = window.innerWidth < mobileBreakpoint !== useMobileLayout;
    if (forcedPreview === null && crossedLayoutBreakpoint) window.location.reload();
  },
  { signal: listenerController.signal },
);
playground.onDestroy(() => listenerController.abort());
