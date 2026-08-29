import { createPlaygroundApp } from './app';
import type { PlaygroundLayout } from './layout';

const previewParameter = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

const forcedLayout: PlaygroundLayout | undefined =
  previewParameter === 'desktop' || previewParameter === 'mobile' ? previewParameter : undefined;

const playground = createPlaygroundApp(forcedLayout);
playground.mount('#root');
