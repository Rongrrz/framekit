import { fk } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPageShell } from '../src/page-shell';
import { themes } from '../src/theme';
import { installAnimationClock } from './support/animation-clock';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('playground page shell', () => {
  it('retargets one retained scroll spring between documentation sections', () => {
    const clock = installAnimationClock();
    vi.stubGlobal('innerWidth', 1292);
    const shell = createPageShell(
      fk.createValue('desktop'),
      fk.createValue(themes.dark),
      fk.createValue('guide'),
    );
    const heading = fk.createTextLabel({ Position: fk.udim2FromOffset(0, 600) });
    heading.Parent = shell.content;
    vi.spyOn(heading.unsafeElement, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, heading.Position.Y.Offset - shell.page.CanvasPosition.Y + 16, 100, 48),
    );
    shell.scrollTo(heading);
    for (let frame = 0; frame < 8; frame += 1) clock.advance();
    expect(shell.page.CanvasPosition.Y).toBeGreaterThan(0);
    expect(shell.page.CanvasPosition.Y).toBeLessThan(600);

    heading.Position = fk.udim2FromOffset(0, 300);
    shell.scrollTo(heading);
    clock.settle();
    expect(shell.page.CanvasPosition).toEqual(fk.vector2(0, 300));
    shell.app.destroy();
  });

  it('stops the scroll spring when CanvasPosition is assigned directly', () => {
    const clock = installAnimationClock();
    vi.stubGlobal('innerWidth', 1292);
    const shell = createPageShell(
      fk.createValue('desktop'),
      fk.createValue(themes.dark),
      fk.createValue('guide'),
    );
    const heading = fk.createTextLabel();
    heading.Parent = shell.content;
    vi.spyOn(heading.unsafeElement, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 616 - shell.page.CanvasPosition.Y, 100, 48),
    );
    shell.scrollTo(heading);
    clock.advance();
    shell.page.CanvasPosition = fk.vector2(0, 120);
    clock.settle();

    expect(shell.page.CanvasPosition).toEqual(fk.vector2(0, 120));
    shell.app.destroy();
  });
});
