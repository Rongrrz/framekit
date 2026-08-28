import { fk } from 'framekit';

import { createScaledPageShell } from '../shared/page-shell';
import { colors } from '../theme';
import { designWidth, pageHeight, sectionLayout } from './layout';
import { createApi } from './sections/api';
import { createComposer } from './sections/composer';
import { createFooter } from './sections/footer';
import { createGuide } from './sections/guide';
import { createHero } from './sections/hero';
import { createLifecycle } from './sections/lifecycle';
import { createMotionSection } from './sections/motion';
import { createNavigation } from './sections/navigation';
import { createPrinciples } from './sections/principles';
import { createValues } from './sections/values';

export function createDesktopApp(): fk.ScreenGuiNode {
  const { app, page, content, navigate, pageScale } = createScaledPageShell({
    name: 'FrameKitDesktop',
    designWidth,
    pageHeight,
    navigationHeight: 76,
    backgroundColor: colors.ink,
  });

  content.addChild(createHero(() => navigate(sectionLayout.principles.top)));

  content.addChild(createPrinciples());

  content.addChild(createMotionSection());

  content.addChild(createComposer());

  content.addChild(createValues());

  content.addChild(createApi());

  content.addChild(createGuide());

  content.addChild(createLifecycle());

  content.addChild(createFooter(() => navigate(0)));

  app.addChild(createNavigation(page, navigate, pageScale));
  return app;
}
