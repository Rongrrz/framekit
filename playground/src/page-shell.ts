import { fk } from 'framekit';

import { pageHeight, pageWidth, type PlaygroundLayout } from './layout';
import type { SitePage } from './router';
import { bindThemeProperties, scrollbarThickness, type ThemeMode } from './theme';

type PageShell = Readonly<{
  app: fk.ScreenGui;
  page: fk.ScrollingFrame;
  content: fk.Frame;
  scrollTo: (offset: number) => void;
}>;

const appName = 'FrameKitPlayground';
export const navigationHeight = 64;

/** Owns the responsive canvas, native scrolling, and route-specific page height. */
export const createPageShell = (
  layout: fk.Value<PlaygroundLayout>,
  theme: fk.Value<ThemeMode>,
  route: fk.Value<SitePage>,
): PageShell => {
  let currentScale = calculateScale(layout.get());
  const app = fk.createScreenGui({ Name: appName, DisplayOrder: 10 });
  const page = fk.createScrollingFrame({
    Name: `${appName}Page`,
    Size: fk.udim2(1, 0, 1, -navigationHeight),
    Position: fk.udim2FromOffset(0, navigationHeight),
    ScrollingDirection: 'Y',
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
  const contentScale = fk.createUIScale({ Scale: currentScale });

  page.element.classList.add('pg-scroll');
  bindThemeProperties(page, theme, (palette) => ({ BackgroundColor3: palette.canvas }));
  content.addChild(contentScale);
  scrollSizer.addChild(content);
  page.addChild(scrollSizer);
  app.addChild(page);

  function calculateScale(currentLayout: PlaygroundLayout): number {
    const availableWidth = Math.max(1, window.innerWidth - scrollbarThickness);
    return Math.min(1, availableWidth / pageWidth[currentLayout]);
  }

  const updateCanvas = (): void => {
    const currentLayout = layout.get();
    const height = pageHeight[currentLayout][route.get()];
    currentScale = calculateScale(currentLayout);
    const availableWidth = Math.max(1, window.innerWidth - scrollbarThickness);
    const width = Math.max(pageWidth[currentLayout], availableWidth / currentScale);

    contentScale.Scale = currentScale;
    scrollSizer.Size = fk.udim2(1, 0, 0, height * currentScale);
    content.setProperties({
      Size: fk.udim2FromOffset(width, height),
      Position: fk.udim2(
        0.5,
        -((1 - currentScale) * width) / 2,
        0,
        -((1 - currentScale) * height) / 2,
      ),
    });
  };

  const listenerController = new AbortController();
  window.addEventListener('resize', updateCanvas, { signal: listenerController.signal });
  app.onDestroy(() => listenerController.abort());
  app.watch(layout, updateCanvas);
  app.watch(route, () => {
    page.CanvasPosition = fk.vector2(0, 0);
    updateCanvas();
  });

  return Object.freeze({
    app,
    page,
    content,
    scrollTo: (offset: number) => page.scrollTo(fk.vector2(0, offset * currentScale)),
  });
};
