import {
  createFrame,
  createScreenGui,
  createScrollingFrame,
  createUIScale,
  type Frame,
  type GuiElement,
  type ScreenGui,
  type ScrollingFrame,
  spring,
  type SpringOptions,
  udim2,
  udim2FromOffset,
  type Value,
  vector2,
} from 'framekit';

import { pageHeight, pageWidth, type PlaygroundLayout } from './layout';
import { watchOwnedValue } from './owned-value';
import type { SitePage } from './router';
import { bindThemeColors, scrollbarThickness, themeColor, type ThemeValue } from './theme';

type PageShell = Readonly<{
  app: ScreenGui;
  page: ScrollingFrame;
  content: Frame;
  addPage: (name: SitePage, frame: Frame) => void;
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

/** Owns the responsive canvas, native scrolling, and route-specific page height. */
export const createPageShell = (
  layout: Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: Value<SitePage>,
): PageShell => {
  const app = createScreenGui({ Name: appName, DisplayOrder: 10 });
  const page = createScrollingFrame({
    Name: `${appName}Page`,
    Size: udim2(1, 0, 1, -navigationHeight),
    Position: udim2FromOffset(0, navigationHeight),
    ScrollingDirection: 'Y',
    ScrollBarImageColor3: themeColor(theme, 'textFaint'),
    ScrollBarThickness: scrollbarThickness,
  });
  const scrollSizer = createFrame({
    Name: `${appName}ScrollSizer`,
    BackgroundTransparency: 1,
  });
  const content = createFrame({
    Name: `${appName}Content`,
    AnchorPoint: vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  const contentScale = createUIScale();
  const pages = new Map<SitePage, Frame>();

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
    const height = pages.get(route.get())?.Size.Y.Offset ?? pageHeight[currentLayout][route.get()];
    const scale = calculateScale(currentLayout);
    const availableWidth = Math.max(1, window.innerWidth - scrollbarThickness);
    const width = Math.max(pageWidth[currentLayout], availableWidth / scale);

    contentScale.Scale = scale;
    scrollSizer.Size = udim2(1, 0, 0, height * scale);
    content.setProperties({
      Size: udim2FromOffset(width, height),
      Position: udim2(0.5, -((1 - scale) * width) / 2, 0, -((1 - scale) * height) / 2),
    });
  };

  const listenerController = new AbortController();
  window.addEventListener('resize', updateCanvas, { signal: listenerController.signal });
  app.onDestroy(() => listenerController.abort());
  watchOwnedValue(app, layout, updateCanvas);
  watchOwnedValue(app, route, () => {
    page.CanvasPosition = vector2(0, 0);
    updateCanvas();
  });

  return Object.freeze({
    app,
    page,
    content,
    addPage: (name: SitePage, frame: Frame) => {
      pages.set(name, frame);
      frame.Parent = content;
      frame.onPropertyChanged('Size', updateCanvas);
      updateCanvas();
    },
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
