import { describe, expect, it, vi } from 'vitest';

import { createStyleModifier } from '../../../core/node/modifier';
import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('modifier attachment and validation', () => {
  it('rejects invalid parent node roles', () => {
    const parentModifier = fk.createUICorner();
    const corner = fk.createUICorner({ CornerRadius: 8 });

    expect(() => parentModifier.addChild(corner)).toThrow(/cannot contain child nodes/);
    expect(corner.Parent).toBeUndefined();
    expect(() => corner.addChild(fk.createFrame())).toThrow(/cannot contain child nodes/);
  });

  it('allows only one modifier of each kind per parent', () => {
    const frame = fk.createTextLabel();
    const firstCorner = fk.createUICorner({ CornerRadius: 4 });
    const secondCorner = fk.createUICorner({ CornerRadius: 8 });

    frame.addChild(firstCorner);

    expect(() => frame.addChild(secondCorner)).toThrow(/already has a UICorner/);
    expect(secondCorner.Parent).toBeUndefined();
    expect(frame.element.style.borderRadius).toBe('4px');

    firstCorner.removeFromParent();
    frame.addChild(secondCorner);

    expect(frame.element.style.borderRadius).toBe('8px');

    const otherFrame = fk.createTextLabel();

    otherFrame.addChild(firstCorner);

    expect(() => frame.addChild(firstCorner)).toThrow(/already has a UICorner/);
    expect(firstCorner.Parent).toBe(otherFrame);
    expect(otherFrame.element.style.borderRadius).toBe('4px');

    secondCorner.destroy();
    frame.addChild(firstCorner);

    expect(firstCorner.Parent).toBe(frame);
    expect(otherFrame.element.style.borderRadius).toBe('');
  });

  it('recomputes both parents when a modifier is moved', () => {
    const first = fk.createTextLabel();
    const second = fk.createTextLabel();
    const corner = fk.createUICorner({ CornerRadius: 10 });

    first.addChild(corner);

    expect(first.element.style.borderRadius).toBe('10px');

    second.addChild(corner);

    expect(first.element.style.borderRadius).toBe('');
    expect(second.element.style.borderRadius).toBe('10px');
  });

  it('rolls back a failed modifier append without corrupting its target', () => {
    const frame = fk.createFrame({ Name: 'RejectedTarget' });
    const render = vi.fn(() => ({}));
    const rejected = createStyleModifier(
      'Rejected',
      { Name: 'Rejected' },
      render,
      undefined,
      (_, target) => {
        if (target.properties.Name === 'RejectedTarget') throw new Error('target rejected');
      },
    );

    expect(() => frame.addChild(rejected)).toThrow(/target rejected/);
    expect(rejected.Parent).toBeUndefined();
    expect(render).not.toHaveBeenCalled();

    const corner = fk.createUICorner({ CornerRadius: 6 });

    frame.addChild(corner);

    expect(frame.element.style.borderRadius).toBe('6px');
  });

  it('rejects non-finite modifier properties at construction', () => {
    expect(() => fk.createUIStroke({ Thickness: Number.NaN })).toThrow(/Thickness.*finite/);
    expect(() => fk.createUICorner({ CornerRadius: Number.POSITIVE_INFINITY })).toThrow(
      /CornerRadius.*finite/,
    );
  });

  it('validates domain-specific modifier values while detached', () => {
    expect(() => fk.createUIScale({ Scale: -1 })).toThrow(/non-negative finite/);
    expect(() => fk.createUITextStroke({ Thickness: -1 })).toThrow(/non-negative finite/);

    const scale = fk.createUIScale();

    expect(() => scale.setProperties({ Scale: -1 })).toThrow(/non-negative finite/);
    expect(scale.Scale).toBe(1);
  });
});
