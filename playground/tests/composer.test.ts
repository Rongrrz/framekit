import { fk } from 'framekit';
import { afterEach, describe, expect, it } from 'vitest';

import { setupAnimationClock } from '../../src/tests/shared/animation-clock';
import { createComposer } from '../desktop/sections/composer';

const { settle } = setupAnimationClock();

afterEach(() => {
  document.body.replaceChildren();
});

describe('modifier composer', () => {
  it('keeps the desktop stroke, shadow, and padding controls live across repeated clicks', () => {
    const section = createComposer();
    const card = section.findFirstChild('NotificationCard', true)!;
    const tags = card.findFirstChild('FeatureTags', true)!;
    const stroke = card.findFirstChild('UIStroke', true)!;
    const shadow = card.findFirstChild('UIShadow', true)!;
    const strokeControl = section.findFirstChild('STROKEButton', true) as fk.TextButtonNode;
    const shadowControl = section.findFirstChild('SHADOWButton', true) as fk.TextButtonNode;
    const paddingControl = section.findFirstChild('PADDINGButton', true) as fk.TextButtonNode;

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
