import { fk, fka } from 'framekit';

import { maximumPageScale, type PlaygroundLayout } from './layout';

type ScaledPageShell = Readonly<{
  app: fk.ScreenGuiNode;
  page: fk.ScrollingFrameNode;
  content: fk.FrameNode;
  navigate: (offset: number) => void;
}>;

export type ScaledPageShellOptions = Readonly<{
  name: string;
  designWidth: number;
  pageHeight: number;
  navigationHeight: number;
  backgroundColor: fk.Color3;
  layout: fk.Value<PlaygroundLayout>;
}>;

/** Owns the scaled page canvas and its spring-driven scroll position. */
export function createScaledPageShell(options: ScaledPageShellOptions): ScaledPageShell {
  let currentScale = calculateScale();

  const app = fk.createScreenGui({ Name: options.name, DisplayOrder: 10 });

  const page = fk.createScrollingFrame({
    Name: `${options.name}Page`,
    Size: fk.udim2(1, 0, 1, -options.navigationHeight),
    Position: fk.udim2FromOffset(0, options.navigationHeight),
    BackgroundColor3: options.backgroundColor,
    ScrollingDirection: 'Y',
  });

  const scrollSizer = fk.createFrame({
    Name: `${options.name}ScrollSizer`,
    Size: fk.udim2(1, 0, 0, options.pageHeight * currentScale),
    BackgroundTransparency: 1,
  });

  const content = fk.createFrame({
    Name: `${options.name}Content`,
    Size: fk.udim2FromOffset(options.designWidth, options.pageHeight),
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
    return Math.min(
      maximumPageScale[options.layout.get()],
      window.innerWidth / options.designWidth,
    );
  }

  function scaledContentPosition(scale: number): fk.UDim2 {
    return fk.udim2(0.5, 0, 0, -((1 - scale) * options.pageHeight) / 2);
  }
  function navigate(offset: number): void {
    scrollController.stop('CanvasPosition');
    fka.spring(page, { CanvasPosition: fk.vector2(0, offset * currentScale) });
  }
  function updateScale(): void {
    currentScale = calculateScale();
    contentScale.setProperties({ Scale: currentScale });
    scrollSizer.setProperties({
      Size: fk.udim2(1, 0, 0, options.pageHeight * currentScale),
    });
    content.setProperties({ Position: scaledContentPosition(currentScale) });
  }

  const listenerController = new AbortController();
  window.addEventListener('resize', updateScale, { signal: listenerController.signal });
  app.onDestroy(() => listenerController.abort());
  app.watch(options.layout, updateScale);

  return Object.freeze({
    app,
    page,
    content,
    navigate,
  });
}
