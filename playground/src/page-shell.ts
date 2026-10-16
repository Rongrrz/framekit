import {
  watchOwnedValue,
  createFrame,
  createScreenGui,
  createScrollingFrame,
  type Frame,
  type GuiElement,
  type ScreenGui,
  type ScrollingFrame,
  spring,
  type SpringOptions,
  udim2,
  udim2FromOffset,
  type ObservableValue,
  vector2,
} from 'framekit';

import type { SitePage } from './router';
import { bindThemeColors, scrollbarThickness, themeColor, type ThemeValue } from './theme';

type PageShell = Readonly<{
  app: ScreenGui;
  page: ScrollingFrame;
  content: Frame;
  scrollTo: (target: GuiElement) => void;
}>;

const appName = 'FrameKitPlayground';

export const navigationHeight = 64;

const scrollSpringOptions = {
  tension: 150,
  friction: 25,
  precision: 0.25,
  restVelocity: 1,
} satisfies SpringOptions;

/** Native flow determines page height; scrolling stays owned by the FrameKit root. */
export const createPageShell = (theme: ThemeValue, route: ObservableValue<SitePage>): PageShell => {
  const app = createScreenGui({ Name: appName, DisplayOrder: 10 });

  const page = createScrollingFrame({
    Name: `${appName}Page`,
    Size: udim2(1, 0, 1, -navigationHeight),
    Position: udim2FromOffset(0, navigationHeight),
    ScrollingDirection: 'Y',
    ScrollBarImageColor3: themeColor(theme, 'textFaint'),
    ScrollBarThickness: scrollbarThickness,
  });

  const content = createFrame({
    Name: `${appName}Content`,
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });

  content.unsafeElement.classList.add('pg-content');
  page.unsafeElement.setAttribute('role', 'main');
  page.unsafeElement.setAttribute('aria-label', 'FrameKit documentation');

  bindThemeColors(page, theme, (palette) => ({
    BackgroundColor3: palette.canvas,
    ScrollBarImageColor3: palette.textFaint,
  }));
  content.Parent = page;
  page.Parent = app;
  watchOwnedValue(app, route, () => {
    page.CanvasPosition = vector2(0, 0);
  });

  return Object.freeze({
    app,
    page,
    content,

    scrollTo: (target: GuiElement) => {
      const goal = vector2(
        0,
        Math.max(
          0,
          page.CanvasPosition.Y + target.AbsolutePosition.Y - page.AbsolutePosition.Y - 16,
        ),
      );

      if (prefersReducedMotion()) {
        page.scrollTo(goal);

        return;
      }

      spring(page, { CanvasPosition: goal }, scrollSpringOptions);
    },
  });
};

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
