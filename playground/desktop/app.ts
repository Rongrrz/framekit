import { fk } from 'framekit';

import { createPlaygroundApp } from '../shared/playground-app';
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
  return createPlaygroundApp({
    shell: {
      name: 'FrameKitDesktop',
      designWidth,
      pageHeight,
      navigationHeight: 76,
      backgroundColor: colors.ink,
    },
    exploreOffset: sectionLayout.principles.top,
    sections: {
      createHero,
      createPrinciples,
      createMotion: createMotionSection,
      createComposer,
      createValues,
      createApi,
      createGuide,
      createLifecycle,
      createFooter,
    },
    createNavigation,
  });
}
