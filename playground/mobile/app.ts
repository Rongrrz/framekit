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

  fk.append(
    content,
    createHero(() => navigate(sectionLayout.motion.top)),
  );
  fk.append(content, createPrinciples());
  fk.append(content, createMotion());
  fk.append(content, createComposer());
  fk.append(content, createValues());
  fk.append(content, createApi());
  fk.append(content, createGuide());
  fk.append(content, createLifecycle());
  fk.append(
    content,
    createFooter(() => navigate(0)),
  );
  fk.append(app, createNavigation(page, navigate));
  return app;
}
