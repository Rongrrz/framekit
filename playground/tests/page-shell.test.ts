import {
  createFrame,
  createTextLabel,
  createValue,
  type Frame,
  udim2,
  udim2FromOffset,
  vector2,
} from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pageHeight, type PlaygroundLayout } from '../src/layout';
import { createPageShell } from '../src/page-shell';
import type { SitePage } from '../src/router';
import { scrollbarThickness, themes } from '../src/theme';
import { installAnimationClock } from './support/animation-clock';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('playground page shell', () => {
  it('sizes the scroll canvas from the active page as its content changes', () => {
    vi.stubGlobal('innerWidth', 1292);
    const route = createValue<SitePage>('guide');
    const shell = createPageShell(createValue('desktop'), createValue(themes.dark), route);
    const guide = createFrame({ Size: udim2(1, 0, 0, 1400) });
    const api = createFrame({ Size: udim2(1, 0, 0, 2400) });
    shell.addPage('guide', guide);
    shell.addPage('api', api);
    expect(shell.content.Size.Y.Offset).toBe(1400);
    guide.Size = udim2(1, 0, 0, 1600);
    expect(shell.content.Size.Y.Offset).toBe(1600);
    route.set('api');
    expect(shell.content.Size.Y.Offset).toBe(2400);
    guide.Size = udim2(1, 0, 0, 1800);
    expect(shell.content.Size.Y.Offset).toBe(2400);
    expect(shell.content.Parent?.isA('Frame')).toBe(true);
    expect((shell.content.Parent as Frame).Size.Y.Offset).toBe(2400);
    shell.app.destroy();
  });

  it('retargets one retained scroll spring between documentation sections', () => {
    const clock = installAnimationClock();
    vi.stubGlobal('innerWidth', 1292);
    const shell = createPageShell(
      createValue('desktop'),
      createValue(themes.dark),
      createValue('guide'),
    );
    const heading = createTextLabel({ Position: udim2FromOffset(0, 600) });
    heading.Parent = shell.content;
    vi.spyOn(heading.unsafeElement, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, heading.Position.Y.Offset - shell.page.CanvasPosition.Y + 16, 100, 48),
    );
    shell.scrollTo(heading);
    for (let frame = 0; frame < 8; frame += 1) clock.advance();
    expect(shell.page.CanvasPosition.Y).toBeGreaterThan(0);
    expect(shell.page.CanvasPosition.Y).toBeLessThan(600);

    heading.Position = udim2FromOffset(0, 300);
    shell.scrollTo(heading);
    clock.settle();
    expect(shell.page.CanvasPosition).toEqual(vector2(0, 300));
    shell.app.destroy();
  });

  it('stops the scroll spring when CanvasPosition is assigned directly', () => {
    const clock = installAnimationClock();
    vi.stubGlobal('innerWidth', 1292);
    const shell = createPageShell(
      createValue('desktop'),
      createValue(themes.dark),
      createValue('guide'),
    );
    const heading = createTextLabel();
    heading.Parent = shell.content;
    vi.spyOn(heading.unsafeElement, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 616 - shell.page.CanvasPosition.Y, 100, 48),
    );
    shell.scrollTo(heading);
    clock.advance();
    shell.page.CanvasPosition = vector2(0, 120);
    clock.settle();

    expect(shell.page.CanvasPosition).toEqual(vector2(0, 120));
    shell.app.destroy();
  });

  it('resets scrolling and cancels in-flight section navigation when the route changes', () => {
    const clock = installAnimationClock();
    const route = createValue<SitePage>('guide');
    const shell = createPageShell(createValue('desktop'), createValue(themes.dark), route);
    const heading = createTextLabel();
    heading.Parent = shell.content;
    vi.spyOn(heading.unsafeElement, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 616, 100, 48),
    );
    shell.scrollTo(heading);
    clock.advance();
    expect(shell.page.CanvasPosition.Y).toBeGreaterThan(0);
    route.set('api');
    clock.settle();
    expect(shell.page.CanvasPosition).toEqual(vector2(0, 0));
    expect(shell.content.Size.Y.Offset).toBe(pageHeight.desktop.api);
    shell.app.destroy();
  });

  it.each([
    ['desktop', 1292, 1],
    ['desktop', 652, 0.5],
    ['mobile', 402, 1],
    ['mobile', 207, 0.5],
  ] as const)('scales the %s canvas at viewport width %s', (initialLayout, width, scale) => {
    vi.stubGlobal('innerWidth', width);
    const layout = createValue<PlaygroundLayout>(initialLayout);
    const shell = createPageShell(layout, createValue(themes.dark), createValue('home'));
    const contentScale = shell.content.getChildren().find((node) => node.isA('UIScale'));
    const scrollSizer = shell.content.Parent;
    if (!contentScale?.isA('UIScale') || !scrollSizer?.isA('Frame'))
      throw new Error('Missing canvas sizing nodes.');
    expect(contentScale.Scale).toBe(scale);
    expect(scrollSizer.Size.Y.Offset).toBe(pageHeight[initialLayout].home * scale);
    vi.stubGlobal('innerWidth', 1600);
    window.dispatchEvent(new Event('resize'));
    expect(contentScale.Scale).toBe(1);
    expect(shell.content.Size.X.Offset).toBe(1600 - scrollbarThickness);
    shell.app.destroy();
  });

  it('scrolls immediately and clamps above-canvas targets under reduced motion', () => {
    const clock = installAnimationClock();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const shell = createPageShell(
      createValue('desktop'),
      createValue(themes.dark),
      createValue('guide'),
    );
    const heading = createTextLabel();
    heading.Parent = shell.content;
    const bounds = vi
      .spyOn(heading.unsafeElement, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 316, 100, 48));
    shell.scrollTo(heading);
    expect(shell.page.CanvasPosition).toEqual(vector2(0, 300));
    bounds.mockReturnValue(new DOMRect(0, -400, 100, 48));
    shell.scrollTo(heading);
    expect(shell.page.CanvasPosition).toEqual(vector2(0, 0));
    clock.settle();
    expect(shell.page.CanvasPosition).toEqual(vector2(0, 0));
    shell.app.destroy();
  });
});
