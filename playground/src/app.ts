import { bindResponsiveLayout, createValue, type ScreenGui } from 'framekit';

import { createApiPage } from './components/api-page';
import { createGuidePage } from './components/guide-page';
import { createHomePage } from './components/home';
import { createNavigation } from './components/navigation';
import { mobileBreakpoint, type PlaygroundLayout } from './layout';
import { createPageShell } from './page-shell';
import { bindHashRouter, navigateToPage, resolveInitialPage } from './router';
import {
  bindDocumentTheme,
  bindThemeTransition,
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
  const layout = createValue<PlaygroundLayout>(initialLayout);
  const theme = createValue<ThemeMode>(initialTheme);
  const palette = createValue(themes[initialTheme]);
  const route = createValue(resolveInitialPage());
  const { app, page, addPage, scrollTo } = createPageShell(layout, palette, route);
  const navigate = (destination: Parameters<typeof navigateToPage>[1]): void =>
    navigateToPage(route, destination);

  bindDocumentTheme(app, theme);
  bindThemeTransition(app, theme, palette);
  bindHashRouter(app, route);
  addPage('home', createHomePage(layout, palette, route, navigate));
  addPage('guide', createGuidePage(layout, palette, route, scrollTo, navigate));
  addPage('api', createApiPage(layout, palette, route, scrollTo));
  createNavigation(page, route, navigate, layout, theme, palette).Parent = app;

  if (forcedLayout === undefined) {
    bindResponsiveLayout(app, {
      breakpoint: mobileBreakpoint,
      mobile: () => layout.set('mobile'),
      desktop: () => layout.set('desktop'),
    });
  }
  return app;
};
