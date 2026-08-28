import { fk } from 'framekit';
import { afterEach, describe, expect, it } from 'vitest';

import { setupAnimationClock } from '../../src/__tests__/helpers/animation-clock';
import { createComposer } from '../desktop/sections/composer';
import { createSpringModifierToggle } from './modifier';

const { settle } = setupAnimationClock();

afterEach(() => {
  document.body.replaceChildren();
});

describe('spring modifier toggles', () => {
  it('can repeatedly detach and reattach the same modifier', () => {
    const frame = fk.createFrame();
    const glow = fk.createUIGlow({ Transparency: 1, Radius: 0 });
    const motion = fk.createMotion(glow);
    let active = false;
    const toggle = createSpringModifierToggle({
      parent: frame,
      modifier: glow,
      motion,
      active: { Transparency: 0.2, Radius: 32 },
      inactive: { Transparency: 1, Radius: 0 },
      isActive: () => active,
    });

    for (let cycle = 0; cycle < 3; cycle += 1) {
      active = true;
      toggle(true);
      settle();
      expect(fk.parent(glow)).toBe(frame);
      expect(fk.props(glow)).toMatchObject({ Transparency: 0.2, Radius: 32 });

      active = false;
      toggle(false);
      settle();
      expect(fk.parent(glow)).toBeUndefined();
      expect(fk.props(glow)).toMatchObject({ Transparency: 1, Radius: 0 });
    }
  });

  it('keeps the desktop stroke, shadow, glow, and padding controls live across repeated clicks', () => {
    const section = createComposer();
    const card = fk.find(section, 'NotificationCard', true)!;
    const tags = fk.find(card, 'FeatureTags', true)!;
    const stroke = fk.find(card, 'UIStroke', true)!;
    const shadow = fk.find(card, 'UIShadow', true)!;
    const glow = fk.find(card, 'UIGlow', true)!;
    const strokeControl = fk.find(section, 'STROKEButton', true) as fk.TextButtonNode;
    const shadowControl = fk.find(section, 'SHADOWButton', true) as fk.TextButtonNode;
    const glowControl = fk.find(section, 'GLOWButton', true) as fk.TextButtonNode;
    const paddingControl = fk.find(section, 'PADDINGButton', true) as fk.TextButtonNode;
    settle();

    for (const [modifier, control] of [
      [stroke, strokeControl],
      [shadow, shadowControl],
      [glow, glowControl],
    ] as const) {
      for (let click = 0; click < 4; click += 1) {
        control.element.click();
        settle();
        expect(fk.parent(modifier) === card).toBe(click % 2 === 1);
      }
    }

    paddingControl.element.click();
    settle();
    const padding = fk.find(tags, 'UIPadding', true)!;
    expect(fk.parent(padding)).toBe(tags);
    for (let click = 0; click < 4; click += 1) {
      paddingControl.element.click();
      settle();
      expect(fk.parent(padding) === tags).toBe(click % 2 === 1);
    }
  });
});
