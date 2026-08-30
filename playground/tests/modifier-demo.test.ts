import { fk } from 'framekit';
import { afterEach, describe, expect, it } from 'vitest';

import { setupAnimationClock } from '../../src/test/support/animation-clock';
import { createModifierDemo } from '../components/modifier-demo';

const { settle } = setupAnimationClock();

afterEach(() => {
  document.body.replaceChildren();
});

describe('modifier demo', () => {
  it('keeps stroke, shadow, and padding controls live across repeated clicks', () => {
    const demo = createModifierDemo(fk.createValue('mobile'));
    const card = demo.findFirstChild('NotificationCard', true)!;
    const tags = card.findFirstChild('FeatureTags', true)!;
    const stroke = card.findFirstChild('UIStroke', true)!;
    const shadow = card.findFirstChild('UIShadow', true)!;
    const strokeControl = demo.findFirstChild('STROKEButton', true) as fk.TextButton;
    const shadowControl = demo.findFirstChild('SHADOWButton', true) as fk.TextButton;
    const paddingControl = demo.findFirstChild('PADDINGButton', true) as fk.TextButton;

    settle();
    for (const [modifier, control] of [
      [stroke, strokeControl],
      [shadow, shadowControl],
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
