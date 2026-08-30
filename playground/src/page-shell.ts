import { fk, fka } from 'framekit';

import {
  pageHeight,
  pageWidth,
  sectionLayout,
  type PlaygroundLayout,
  type SectionName,
} from './layout';
import { colors } from './theme';

type PageShell = Readonly<{
  app: fk.ScreenGui;
  page: fk.ScrollingFrame;
  content: fk.Frame;
  navigate: (section: SectionName | 'top') => void;
}>;

const appName = 'FrameKitPlayground';
const navigationHeight = 72;

/** Owns the centered responsive canvas and spring-driven section navigation. */
export function createPageShell(layout: fk.Value<PlaygroundLayout>): PageShell {
  let currentScale = calculateScale(layout.get());
  const app = fk.createScreenGui({ Name: appName, DisplayOrder: 10 });
  const page = fk.createScrollingFrame({
    Name: `${appName}Page`,
    Size: fk.udim2(1, 0, 1, -navigationHeight),
    Position: fk.udim2FromOffset(0, navigationHeight),
    BackgroundColor3: colors.ink,
    ScrollingDirection: 'Y',
    ScrollBarThickness: 0,
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

  page.element.classList.add('fk-noise');

  content.addChild(contentScale);
  scrollSizer.addChild(content);
  page.addChild(scrollSizer);
  app.addChild(page);

  function calculateScale(currentLayout: PlaygroundLayout): number {
    return Math.min(1, window.innerWidth / pageWidth[currentLayout]);
  }

  function navigate(section: SectionName | 'top'): void {
    const offset = section === 'top' ? 0 : sectionLayout[layout.get()][section].top;
    fka.spring(
      page,
      { CanvasPosition: fk.vector2(0, offset * currentScale) },
      { tension: 190, friction: 28 },
    );
  }

  function updateCanvas(): void {
    const currentLayout = layout.get();
    currentScale = calculateScale(currentLayout);
    const height = pageHeight[currentLayout];
    const width = Math.max(pageWidth[currentLayout], window.innerWidth / currentScale);

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
  }

  const listenerController = new AbortController();
  window.addEventListener('resize', updateCanvas, { signal: listenerController.signal });
  app.onDestroy(() => listenerController.abort());
  app.watch(layout, updateCanvas);

  return Object.freeze({ app, page, content, navigate });
}
