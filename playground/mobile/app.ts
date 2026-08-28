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

export function createMobileApp(): fk.ScreenGuiNode {
  return createPlaygroundApp({
    shell: {
      name: 'FrameKitMobile',
      designWidth,
      pageHeight,
      navigationHeight: 64,
      backgroundColor: colors.ink,
    },
    exploreOffset: sectionLayout.motion.top,
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
