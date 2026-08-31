import { fk, fkh } from 'framekit';

import { createApiPage } from './components/api-page';
import { createGuidePage } from './components/guide-page';
import { createHomePage } from './components/home';
import { createNavigation } from './components/navigation';
import { mobileBreakpoint, type PlaygroundLayout } from './layout';
import { createPageShell } from './page-shell';
import { bindHashRouter, navigateToPage, resolveInitialPage } from './router';
import { bindDocumentTheme, resolveInitialTheme, type ThemeMode } from './theme';

/** Creates one persistent FrameKit hierarchy shared by every route, layout, and theme. */
export const createPlaygroundApp = (
  forcedLayout?: PlaygroundLayout,
  initialTheme: ThemeMode = resolveInitialTheme(),
): fk.ScreenGui => {
  const initialLayout =
    forcedLayout ?? (window.innerWidth < mobileBreakpoint ? 'mobile' : 'desktop');
  const layout = fk.createValue<PlaygroundLayout>(initialLayout);
  const theme = fk.createValue<ThemeMode>(initialTheme);
  const route = fk.createValue(resolveInitialPage());
  const { app, page, content, scrollTo } = createPageShell(layout, theme, route);
  const navigate = (destination: Parameters<typeof navigateToPage>[1]): void =>
    navigateToPage(route, destination);

  bindDocumentTheme(app, theme);
  bindHashRouter(app, route);
  content.addChild(createHomePage(layout, theme, route, navigate));
  content.addChild(createGuidePage(layout, theme, route, scrollTo, navigate));
  content.addChild(createApiPage(layout, theme, route, scrollTo));
  app.addChild(createNavigation(page, route, navigate, layout, theme));

  if (forcedLayout === undefined) {
    fkh.bindResponsiveLayout(app, {
      breakpoint: mobileBreakpoint,
      mobile: () => layout.set('mobile'),
      desktop: () => layout.set('desktop'),
    });
  }
  return app;
};
