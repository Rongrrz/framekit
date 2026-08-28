import { fk, fka, fkh } from 'framekit';
import { afterEach, describe, expect, it } from 'vitest';

import { setupAnimationClock } from '../../src/__tests__/helpers/animation-clock';
import { createComposer } from '../desktop/sections/composer';

const { settle } = setupAnimationClock();

afterEach(() => {
  document.body.replaceChildren();
});

describe('spring modifier toggles', () => {
  it('can repeatedly detach and reattach the same modifier', () => {
    const frame = fk.createFrame();
    const glow = fk.createUIGlow({ Transparency: 1, Radius: 0 });
    const motion = fka.createMotion(glow);
    let active = false;
    const toggle = fkh.createSpringModifierToggle({
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
      expect(glow.Parent).toBe(frame);
      expect(glow).toMatchObject({ Transparency: 0.2, Radius: 32 });
      active = false;
      toggle(false);
      settle();
      expect(glow.Parent).toBeUndefined();
      expect(glow).toMatchObject({ Transparency: 1, Radius: 0 });
    }
  });
  it('keeps the desktop stroke, shadow, glow, and padding controls live across repeated clicks', () => {
    const section = createComposer();
    const card = section.findFirstChild('NotificationCard', true)!;
    const tags = card.findFirstChild('FeatureTags', true)!;
    const stroke = card.findFirstChild('UIStroke', true)!;
    const shadow = card.findFirstChild('UIShadow', true)!;
    const glow = card.findFirstChild('UIGlow', true)!;
    const strokeControl = section.findFirstChild('STROKEButton', true) as fk.TextButtonNode;
    const shadowControl = section.findFirstChild('SHADOWButton', true) as fk.TextButtonNode;
    const glowControl = section.findFirstChild('GLOWButton', true) as fk.TextButtonNode;
    const paddingControl = section.findFirstChild('PADDINGButton', true) as fk.TextButtonNode;
    settle();
    for (const [modifier, control] of [
      [stroke, strokeControl],
      [shadow, shadowControl],
      [glow, glowControl],
    ] as const) {
      for (let click = 0; click < 4; click += 1) {
        control.element.click();
        settle();
        expect(modifier.Parent === card).toBe(click % 2 === 1);
      }
    }
    paddingControl.element.click();
    settle();
    const padding = tags.findFirstChild('UIPadding', true)!;
    expect(padding.Parent).toBe(tags);
    for (let click = 0; click < 4; click += 1) {
      paddingControl.element.click();
      settle();
      expect(padding.Parent === tags).toBe(click % 2 === 1);
    }
  });
});
