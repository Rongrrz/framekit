import { createResponsivePlayground, type PlaygroundLayout } from './responsive-app';

const previewParameter = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

const forcedLayout: PlaygroundLayout | undefined =
  previewParameter === 'desktop' || previewParameter === 'mobile' ? previewParameter : undefined;

const playground = createResponsivePlayground(forcedLayout);
playground.mount('#root');
