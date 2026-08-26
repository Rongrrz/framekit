import { fk } from 'framekit';

type ScaledPageShell = Readonly<{
  app: fk.ScreenGuiNode;
  page: fk.ScrollingFrameNode;
  content: fk.FrameNode;
  navigate: (offset: number) => void;
  pageScale: () => number;
}>;

type ScaledPageShellOptions = Readonly<{
  name: string;
  designWidth: number;
  pageHeight: number;
  navigationHeight: number;
  backgroundColor: fk.Color3;
}>;

/** Owns the responsive fixed-design canvas and its spring-driven scroll position. */
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
  const scrollMotion = fk.createMotion(page, {
    tension: 170,
    friction: 26,
    precision: 0.5,
  });

  fk.append(content, contentScale);
  fk.append(scrollSizer, content);
  fk.append(page, scrollSizer);
  fk.append(app, page);

  function calculateScale(): number {
    return Math.min(1, window.innerWidth / options.designWidth);
  }

  function scaledContentPosition(scale: number): fk.UDim2 {
    return fk.udim2(0.5, 0, 0, -((1 - scale) * options.pageHeight) / 2);
  }

  function navigate(offset: number): void {
    scrollMotion.stop('CanvasPosition');
    scrollMotion.spring({ CanvasPosition: fk.vector2(0, offset * currentScale) });
  }

  function updateScale(): void {
    currentScale = calculateScale();
    fk.update(contentScale, { Scale: currentScale });
    fk.update(scrollSizer, {
      Size: fk.udim2(1, 0, 0, options.pageHeight * currentScale),
    });
    fk.update(content, { Position: scaledContentPosition(currentScale) });
  }

  window.addEventListener('resize', updateScale);
  return Object.freeze({
    app,
    page,
    content,
    navigate,
    pageScale: () => currentScale,
  });
}
