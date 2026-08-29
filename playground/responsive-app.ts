import { fkh } from 'framekit';

import { createDesktopApp } from './desktop/app';
import { createMobileApp } from './mobile/app';

export type PlaygroundLayout = 'desktop' | 'mobile';

export type ResponsivePlayground = Readonly<{
  mount: (target: string | HTMLElement) => void;
  destroy: () => void;
}>;

const mobileBreakpoint = 720;

/** Creates both device presentations and keeps their state while switching layouts. */
export function createResponsivePlayground(forcedLayout?: PlaygroundLayout): ResponsivePlayground {
  const desktop = createDesktopApp();
  const mobile = createMobileApp();

  const showDesktop = (): void => {
    mobile.Enabled = false;
    desktop.Enabled = true;
  };

  const showMobile = (): void => {
    desktop.Enabled = false;
    mobile.Enabled = true;
  };

  if (forcedLayout === 'desktop') {
    showDesktop();
  } else if (forcedLayout === 'mobile') {
    showMobile();
  } else {
    fkh.bindResponsiveLayout(desktop, {
      breakpoint: mobileBreakpoint,
      mobile: showMobile,
      desktop: showDesktop,
    });
  }

  return Object.freeze({
    mount: (target: string | HTMLElement): void => {
      desktop.mount(target);
      mobile.mount(target);
    },
    destroy: (): void => {
      desktop.destroy();
      mobile.destroy();
    },
  });
}
