import { fk, fkh } from 'framekit';

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
): fk.ScreenGui => {
  const initialLayout =
    forcedLayout ?? (window.innerWidth < mobileBreakpoint ? 'mobile' : 'desktop');
  const layout = fk.createValue<PlaygroundLayout>(initialLayout);
  const theme = fk.createValue<ThemeMode>(initialTheme);
  const palette = fk.createValue(themes[initialTheme]);
  const route = fk.createValue(resolveInitialPage());
  const { app, page, content, scrollTo } = createPageShell(layout, palette, route);
  const navigate = (destination: Parameters<typeof navigateToPage>[1]): void =>
    navigateToPage(route, destination);

  bindDocumentTheme(app, theme);
  bindThemeTransition(app, theme, palette);
  bindHashRouter(app, route);
  content.addChild(createHomePage(layout, palette, route, navigate));
  content.addChild(createGuidePage(layout, palette, route, scrollTo, navigate));
  content.addChild(createApiPage(layout, palette, route, scrollTo));
  app.addChild(createNavigation(page, route, navigate, layout, theme, palette));

  if (forcedLayout === undefined) {
    fkh.bindResponsiveLayout(app, {
      breakpoint: mobileBreakpoint,
      mobile: () => layout.set('mobile'),
      desktop: () => layout.set('desktop'),
    });
  }
  return app;
};
