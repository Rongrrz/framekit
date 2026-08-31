import { fk } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPageShell } from '../src/page-shell';
import { themes } from '../src/theme';
import { installAnimationClock } from './support/animation-clock';

afterEach(() => {
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

    shell.scrollTo(600);
    for (let frame = 0; frame < 8; frame += 1) clock.advance();
    expect(shell.page.CanvasPosition.Y).toBeGreaterThan(0);
    expect(shell.page.CanvasPosition.Y).toBeLessThan(600);

    shell.scrollTo(300);
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

    shell.scrollTo(600);
    clock.advance();
    shell.page.CanvasPosition = fk.vector2(0, 120);
    clock.settle();

    expect(shell.page.CanvasPosition).toEqual(fk.vector2(0, 120));
    shell.app.destroy();
  });
});
