import { createLandingApp } from './app';
import type { LandingLayout } from './layout';

const previewParameter = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('preview')
  : null;

const forcedLayout: LandingLayout | undefined =
  previewParameter === 'desktop' || previewParameter === 'mobile' ? previewParameter : undefined;

const landing = createLandingApp(forcedLayout);

landing.mount('#root');

if (import.meta.hot) {
  import.meta.hot.dispose(() => landing.destroy());
}

if (import.meta.env.DEV) {
  const { bindRuntimeInspector } = await import('framekit/devtools');
  bindRuntimeInspector(landing, { shortcut: { key: 'F8' } });
}
