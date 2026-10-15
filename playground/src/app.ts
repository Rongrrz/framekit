import {
  bindResponsiveLayout,
  createObservableValue,
  watchOwnedValue,
  type ScreenGui,
} from 'framekit';

import { createApiPage } from './components/api-page';
import { createControlsPage } from './components/controls-page';
import { createGuidePage } from './components/guide-page';
import { createHomePage } from './components/home';
import { createNavigation } from './components/navigation';
import { createOverlaysPage } from './components/overlays-page';
import { referenceChapters } from './components/reference-content';
import { createReferencePage } from './components/reference-page';
import { mobileBreakpoint, type PlaygroundLayout } from './layout';
import { createPageShell } from './page-shell';
import { bindHashRouter, documentationPages, navigateToPage, resolveInitialPage } from './router';
import {
  bindDocumentTheme,
  bindThemePalette,
  resolveInitialTheme,
  themes,
  type ThemeMode,
} from './theme';

/** Creates one persistent FrameKit hierarchy shared by every route, layout, and theme. */
export const createPlaygroundApp = (
  forcedLayout?: PlaygroundLayout,
  initialTheme: ThemeMode = resolveInitialTheme(),
): ScreenGui => {
  const initialLayout =
    forcedLayout ?? (window.innerWidth < mobileBreakpoint ? 'mobile' : 'desktop');
  const layout = createObservableValue<PlaygroundLayout>(initialLayout);
  const theme = createObservableValue<ThemeMode>(initialTheme);
  const palette = createObservableValue(themes[initialTheme]);
  const route = createObservableValue(resolveInitialPage());
  const { app, page, content, scrollTo } = createPageShell(palette, route);
  const navigate = (destination: Parameters<typeof navigateToPage>[1]): void =>
    navigateToPage(route, destination);

  bindDocumentTheme(app, theme);
  bindThemePalette(app, theme, palette);
  bindHashRouter(app, route);
  createHomePage(palette, route, navigate).Parent = content;
  createGuidePage(palette, route, scrollTo).Parent = content;
  createApiPage(palette, route).Parent = content;
  for (const chapter of Object.keys(referenceChapters) as (keyof typeof referenceChapters)[]) {
    createReferencePage(chapter, palette, route, scrollTo).Parent = content;
  }
  createOverlaysPage(layout, palette, route, scrollTo).Parent = content;
  createControlsPage(palette, route, scrollTo).Parent = content;
  createNavigation(page, route, navigate, layout, theme, palette).Parent = app;

  const previousTitle = document.title;
  watchOwnedValue(app, route, (page) => {
    const label = documentationPages.find((entry) => entry.page === page)?.label;
    document.title = label ? `${label} · FrameKit` : 'FrameKit · Typed UI objects for the web';
  });
  app.onDestroy(() => {
    document.title = previousTitle;
  });

  if (forcedLayout === undefined) {
    bindResponsiveLayout(app, {
      breakpoint: mobileBreakpoint,
      mobile: () => layout.set('mobile'),
      desktop: () => layout.set('desktop'),
    });
  }
  return app;
};
