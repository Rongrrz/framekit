import { fk, fkh } from 'framekit';

import { createApi } from './components/api';
import { createFooter } from './components/footer';
import { createHero } from './components/hero';
import { createLifecycle } from './components/lifecycle';
import { createModifiers } from './components/modifiers';
import { createMotion } from './components/motion';
import { createNavigation } from './components/navigation';
import { mobileBreakpoint, type PlaygroundLayout } from './layout';
import { createPageShell } from './page-shell';

/** Creates the playground as one persistent hierarchy shared by every viewport. */
export function createPlaygroundApp(forcedLayout?: PlaygroundLayout): fk.ScreenGui {
  const initialLayout =
    forcedLayout ?? (window.innerWidth < mobileBreakpoint ? 'mobile' : 'desktop');
  const layout = fk.createValue<PlaygroundLayout>(initialLayout);
  const { app, page, content, navigate } = createPageShell(layout);

  content.addChild(createHero(layout, () => navigate('motion')));
  content.addChild(createMotion(layout));
  content.addChild(createModifiers(layout));
  content.addChild(createApi(layout));
  content.addChild(createLifecycle(layout));
  content.addChild(createFooter(layout, () => navigate('top')));
  app.addChild(createNavigation(page, navigate, layout));

  if (forcedLayout === undefined) {
    fkh.bindResponsiveLayout(app, {
      breakpoint: mobileBreakpoint,
      mobile: () => layout.set('mobile'),
      desktop: () => layout.set('desktop'),
    });
  }

  return app;
}
