import { fk, fkh } from 'framekit';

import { createApi } from './components/api';
import { createComposer } from './components/composer';
import { createFooter } from './components/footer';
import { createGuide } from './components/guide';
import { createHero } from './components/hero';
import { createLifecycle } from './components/lifecycle';
import { createMotion } from './components/motion';
import { createNavigation } from './components/navigation';
import { createPrinciples } from './components/principles';
import { createValues } from './components/values';
import { mobileBreakpoint, sectionLayout, type PlaygroundLayout } from './layout';
import { createPageShell } from './page-shell';

/** Creates the playground as one persistent hierarchy shared by every viewport. */
export function createPlaygroundApp(forcedLayout?: PlaygroundLayout): fk.ScreenGui {
  const initialLayout =
    forcedLayout ?? (window.innerWidth < mobileBreakpoint ? 'mobile' : 'desktop');
  const layout = fk.createValue<PlaygroundLayout>(initialLayout);
  const { app, page, content, navigate } = createPageShell(layout);

  content.addChild(createHero(() => navigate(sectionLayout.motion.top)));
  content.addChild(createPrinciples());
  content.addChild(createMotion());
  content.addChild(createComposer());
  content.addChild(createValues());
  content.addChild(createApi());
  content.addChild(createGuide());
  content.addChild(createLifecycle());
  content.addChild(createFooter(() => navigate(0)));
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
