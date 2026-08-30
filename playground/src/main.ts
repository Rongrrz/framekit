import { createPlaygroundApp } from './app';
import type { PlaygroundLayout } from './layout';
import { installPlaygroundStyles } from './theme';

const previewParameter = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

const forcedLayout: PlaygroundLayout | undefined =
  previewParameter === 'desktop' || previewParameter === 'mobile' ? previewParameter : undefined;

installPlaygroundStyles();
const playground = createPlaygroundApp(forcedLayout);
playground.mount('#root');
