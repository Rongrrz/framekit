import { fk, fkh } from 'framekit';

import { createFooter } from './components/footer';
import { createGuide } from './components/guide';
import { createHero } from './components/hero';
import { createNavigation } from './components/navigation';
import { mobileBreakpoint, type PlaygroundLayout } from './layout';
import { createPageShell } from './page-shell';
import { bindDocumentTheme, resolveInitialTheme, type ThemeMode } from './theme';

/** Creates one persistent FrameKit hierarchy shared by every layout and theme. */
export const createPlaygroundApp = (
  forcedLayout?: PlaygroundLayout,
  initialTheme: ThemeMode = resolveInitialTheme(),
): fk.ScreenGui => {
  const initialLayout =
    forcedLayout ?? (window.innerWidth < mobileBreakpoint ? 'mobile' : 'desktop');
  const layout = fk.createValue<PlaygroundLayout>(initialLayout);
  const theme = fk.createValue<ThemeMode>(initialTheme);
  const { app, page, content, navigate } = createPageShell(layout, theme);

  bindDocumentTheme(app, theme);
  content.addChild(createHero(layout, theme, () => navigate('guide')));
  content.addChild(createGuide(layout, theme));
  content.addChild(createFooter(layout, theme, () => navigate('top')));
  app.addChild(createNavigation(page, navigate, layout, theme));

  if (forcedLayout === undefined) {
    fkh.bindResponsiveLayout(app, {
      breakpoint: mobileBreakpoint,
      mobile: () => layout.set('mobile'),
      desktop: () => layout.set('desktop'),
    });
  }
  return app;
};
