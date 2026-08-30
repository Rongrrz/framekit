import { fk } from 'framekit';
import { describe, expect, it } from 'vitest';

import { createApiExplorer } from '../components/api-explorer';
import { createGuideDemo } from '../components/guide-demo';
import { createHeroPreview } from '../components/hero-preview';

describe('interactive playground components', () => {
  it('updates the hero preview without recreating it', () => {
    const preview = createHeroPreview();
    const motion = preview.findFirstChild('MOTIONButton') as fk.TextButtonNode;

    expect(preview.element.textContent).toContain('TYPED NODE');

    motion.element.click();

    expect(preview.element.textContent).toContain('RETAINED MOTION');
    preview.destroy();
  });

  it('switches the API explorer topic in place', () => {
    const explorer = createApiExplorer();
    const state = explorer.findFirstChild('STATEButton') as fk.TextButtonNode;

    expect(explorer.element.textContent).toContain('Inspect the hierarchy.');

    state.element.click();

    expect(explorer.element.textContent).toContain('Connect behavior.');
    explorer.destroy();
  });

  it('attaches guide modifiers at the decorate step', () => {
    const guide = createGuideDemo();
    const card = guide.findFirstChild('ProfileCard', true)!;
    const decorate = guide.findFirstChild('2  DECORATEButton') as fk.TextButtonNode;

    expect(card.findFirstChild('UICorner')).toBeUndefined();

    decorate.element.click();

    expect(card.findFirstChild('UICorner')).toBeDefined();
    expect(card.findFirstChild('UIStroke')).toBeDefined();
    guide.destroy();
  });
});
