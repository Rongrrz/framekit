import { fk, fka } from 'framekit';

import { pageHeight, pageWidth, type PlaygroundLayout } from './layout';
import { watchOwnedValue } from './owned-value';
import type { SitePage } from './router';
import { bindThemeColors, scrollbarThickness, themeColor, type ThemeValue } from './theme';

type PageShell = Readonly<{
  app: fk.ScreenGui;
  page: fk.ScrollingFrame;
  content: fk.Frame;
  scrollTo: (target: fk.GuiElement) => void;
}>;

const appName = 'FrameKitPlayground';
export const navigationHeight = 64;
const scrollSpringOptions = {
  tension: 150,
  friction: 25,
  precision: 0.25,
  restVelocity: 1,
} satisfies fka.SpringOptions;

/** Owns the responsive canvas, native scrolling, and route-specific page height. */
export const createPageShell = (
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: fk.Value<SitePage>,
): PageShell => {
  const app = fk.createScreenGui({ Name: appName, DisplayOrder: 10 });
  const page = fk.createScrollingFrame({
    Name: `${appName}Page`,
    Size: fk.udim2(1, 0, 1, -navigationHeight),
    Position: fk.udim2FromOffset(0, navigationHeight),
    ScrollingDirection: 'Y',
    ScrollBarImageColor3: themeColor(theme, 'textFaint'),
    ScrollBarThickness: scrollbarThickness,
  });
  const scrollSizer = fk.createFrame({
    Name: `${appName}ScrollSizer`,
    BackgroundTransparency: 1,
  });
  const content = fk.createFrame({
    Name: `${appName}Content`,
    AnchorPoint: fk.vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  const contentScale = fk.createUIScale();

  bindThemeColors(page, theme, (palette) => ({
    BackgroundColor3: palette.canvas,
    ScrollBarImageColor3: palette.textFaint,
  }));
  contentScale.Parent = content;
  content.Parent = scrollSizer;
  scrollSizer.Parent = page;
  page.Parent = app;

  function calculateScale(currentLayout: PlaygroundLayout): number {
    const availableWidth = Math.max(1, window.innerWidth - scrollbarThickness);
    return Math.min(1, availableWidth / pageWidth[currentLayout]);
  }

  const updateCanvas = (): void => {
    const currentLayout = layout.get();
    const height = pageHeight[currentLayout][route.get()];
    const scale = calculateScale(currentLayout);
    const availableWidth = Math.max(1, window.innerWidth - scrollbarThickness);
    const width = Math.max(pageWidth[currentLayout], availableWidth / scale);

    contentScale.Scale = scale;
    scrollSizer.Size = fk.udim2(1, 0, 0, height * scale);
    content.setProperties({
      Size: fk.udim2FromOffset(width, height),
      Position: fk.udim2(0.5, -((1 - scale) * width) / 2, 0, -((1 - scale) * height) / 2),
    });
  };

  const listenerController = new AbortController();
  window.addEventListener('resize', updateCanvas, { signal: listenerController.signal });
  app.onDestroy(() => listenerController.abort());
  watchOwnedValue(app, layout, updateCanvas);
  watchOwnedValue(app, route, () => {
    page.CanvasPosition = fk.vector2(0, 0);
    updateCanvas();
  });

  return Object.freeze({
    app,
    page,
    content,
    scrollTo: (target: fk.GuiElement) => {
      const goal = fk.vector2(
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
      fka.spring(page, { CanvasPosition: goal }, scrollSpringOptions);
    },
  });
};

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
