import { fk, fka } from 'framekit';

import { designWidth, maximumPageScale, pageHeight, type PlaygroundLayout } from './layout';
import { colors } from './theme';

type PageShell = Readonly<{
  app: fk.ScreenGuiNode;
  page: fk.ScrollingFrameNode;
  content: fk.FrameNode;
  navigate: (offset: number) => void;
}>;

const appName = 'FrameKitPlayground';
const navigationHeight = 64;

/** Owns the scaled page canvas and its spring-driven scroll position. */
export function createPageShell(layout: fk.Value<PlaygroundLayout>): PageShell {
  let currentScale = calculateScale();

  const app = fk.createScreenGui({ Name: appName, DisplayOrder: 10 });

  const page = fk.createScrollingFrame({
    Name: `${appName}Page`,
    Size: fk.udim2(1, 0, 1, -navigationHeight),
    Position: fk.udim2FromOffset(0, navigationHeight),
    BackgroundColor3: colors.ink,
    ScrollingDirection: 'Y',
  });

  const scrollSizer = fk.createFrame({
    Name: `${appName}ScrollSizer`,
    Size: fk.udim2(1, 0, 0, pageHeight * currentScale),
    BackgroundTransparency: 1,
  });

  const content = fk.createFrame({
    Name: `${appName}Content`,
    Size: fk.udim2FromOffset(designWidth, pageHeight),
    Position: scaledContentPosition(currentScale),
    AnchorPoint: fk.vector2(0.5, 0),
    BackgroundTransparency: 1,
  });

  const contentScale = fk.createUIScale({ Scale: currentScale });

  const scrollController = fka.spring(page);

  content.addChild(contentScale);

  scrollSizer.addChild(content);

  page.addChild(scrollSizer);

  app.addChild(page);

  function calculateScale(): number {
    return Math.min(maximumPageScale[layout.get()], window.innerWidth / designWidth);
  }

  function scaledContentPosition(scale: number): fk.UDim2 {
    return fk.udim2(0.5, 0, 0, -((1 - scale) * pageHeight) / 2);
  }
  function navigate(offset: number): void {
    scrollController.stop('CanvasPosition');
    fka.spring(page, { CanvasPosition: fk.vector2(0, offset * currentScale) });
  }
  function updateScale(): void {
    currentScale = calculateScale();
    contentScale.setProperties({ Scale: currentScale });
    scrollSizer.setProperties({
      Size: fk.udim2(1, 0, 0, pageHeight * currentScale),
    });
    content.setProperties({ Position: scaledContentPosition(currentScale) });
  }

  const listenerController = new AbortController();
  window.addEventListener('resize', updateScale, { signal: listenerController.signal });
  app.onDestroy(() => listenerController.abort());
  app.watch(layout, updateScale);

  return Object.freeze({
    app,
    page,
    content,
    navigate,
  });
}
