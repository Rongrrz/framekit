import { fk } from 'framekit';
import { describe, expect, it } from 'vitest';

import { createApi } from '../src/components/api';
import { createHeroPreview } from '../src/components/hero-preview';
import { createLifecycle } from '../src/components/lifecycle';
import type { PlaygroundLayout } from '../src/layout';

describe('interactive playground components', () => {
  it('updates the hero preview without recreating it', () => {
    const layout = fk.createValue<PlaygroundLayout>('mobile');
    const preview = createHeroPreview(layout);
    const motion = preview.findFirstChild('MOTIONButton') as fk.TextButton;

    expect(preview.element.textContent).toContain('DIRECT INSTANCES');

    motion.element.click();

    expect(preview.element.textContent).toContain('RETAINED MOTION');
    preview.destroy();
  });

  it('switches the API topic in place', () => {
    const layout = fk.createValue<PlaygroundLayout>('mobile');
    const section = createApi(layout);
    const explorer = section.findFirstChild('ApiExplorer', true) as fk.Frame;
    const state = explorer.findFirstChild('STATEButton') as fk.TextButton;

    expect(explorer.element.textContent).toContain('Build a hierarchy.');

    state.element.click();

    expect(explorer.element.textContent).toContain('Share state when useful.');
    section.destroy();
  });

  it('reflows the same hero preview between mobile and desktop', () => {
    const layout = fk.createValue<PlaygroundLayout>('mobile');
    const preview = createHeroPreview(layout);

    expect(preview.Size).toEqual(fk.udim2FromOffset(358, 340));

    layout.set('desktop');

    expect(preview.Size).toEqual(fk.udim2FromOffset(500, 480));
    preview.destroy();
  });

  it('destroys and recreates the lifecycle demo instance', () => {
    const layout = fk.createValue<PlaygroundLayout>('mobile');
    const section = createLifecycle(layout);
    const firstDetails = section.findFirstChild('ItemDetails', true)!;
    const destroy = section.findFirstChild('DESTROYButton', true) as fk.TextButton;
    const add = section.findFirstChild('ADDButton', true) as fk.TextButton;

    destroy.element.click();

    expect(firstDetails.isDestroyed()).toBe(true);
    expect(section.element.textContent).toContain('DESTROYED AND RELEASED');

    add.element.click();

    const replacement = section.findFirstChild('ItemDetails', true)!;
    expect(replacement).not.toBe(firstDetails);
    expect(replacement.Parent?.Name).toBe('Inventory');
    section.destroy();
  });
});
