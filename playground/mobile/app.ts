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
import { createMotion } from './sections/motion';
import { createNavigation } from './sections/navigation';
import { createPrinciples } from './sections/principles';
import { createValues } from './sections/values';

export function createMobileApp(): fk.ScreenGuiNode {
  const { app, page, content, navigate } = createScaledPageShell({
    name: 'FrameKitMobile',
    designWidth,
    pageHeight,
    navigationHeight: 64,
    backgroundColor: colors.ink,
  });

  content.addChild(createHero(() => navigate(sectionLayout.motion.top)));

  content.addChild(createPrinciples());

  content.addChild(createMotion());

  content.addChild(createComposer());

  content.addChild(createValues());

  content.addChild(createApi());

  content.addChild(createGuide());

  content.addChild(createLifecycle());

  content.addChild(createFooter(() => navigate(0)));

  app.addChild(createNavigation(page, navigate));
  return app;
}
