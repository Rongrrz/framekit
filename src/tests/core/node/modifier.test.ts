import { describe, expect, it, vi } from 'vitest';

import { createStyleModifier } from '../../../core/node/modifier.js';
import { fk } from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('modifier attachment and validation', () => {
  it('rejects invalid parent node roles', () => {
    const parentModifier = fk.createUICorner();
    const corner = fk.createUICorner({ CornerRadius: 8 });

    expect(() => (corner.Parent = parentModifier)).toThrow(/cannot contain child nodes/);
    expect(corner.Parent).toBeUndefined();
    expect(() => (fk.createFrame().Parent = corner)).toThrow(/cannot contain child nodes/);
  });

  it('allows only one modifier of each kind per parent', () => {
    const frame = fk.createTextLabel();
    const firstCorner = fk.createUICorner({ CornerRadius: 4 });
    const secondCorner = fk.createUICorner({ CornerRadius: 8 });

    firstCorner.Parent = frame;

    expect(() => (secondCorner.Parent = frame)).toThrow(/already has a UICorner/);
    expect(secondCorner.Parent).toBeUndefined();
    expect(frame.unsafeElement.style.borderRadius).toBe('4px');

    firstCorner.Parent = undefined;
    secondCorner.Parent = frame;

    expect(frame.unsafeElement.style.borderRadius).toBe('8px');

    const otherFrame = fk.createTextLabel();

    firstCorner.Parent = otherFrame;

    expect(() => (firstCorner.Parent = frame)).toThrow(/already has a UICorner/);
    expect(firstCorner.Parent).toBe(otherFrame);
    expect(otherFrame.unsafeElement.style.borderRadius).toBe('4px');

    secondCorner.destroy();
    firstCorner.Parent = frame;

    expect(firstCorner.Parent).toBe(frame);
    expect(otherFrame.unsafeElement.style.borderRadius).toBe('');
  });

  it('recomputes both parents when a modifier is moved', () => {
    const first = fk.createTextLabel();
    const second = fk.createTextLabel();
    const corner = fk.createUICorner({ CornerRadius: 10 });

    corner.Parent = first;

    expect(first.unsafeElement.style.borderRadius).toBe('10px');

    corner.Parent = second;

    expect(first.unsafeElement.style.borderRadius).toBe('');
    expect(second.unsafeElement.style.borderRadius).toBe('10px');
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

    expect(() => (rejected.Parent = frame)).toThrow(/target rejected/);
    expect(rejected.Parent).toBeUndefined();
    expect(render).not.toHaveBeenCalled();

    const corner = fk.createUICorner({ CornerRadius: 6 });

    corner.Parent = frame;

    expect(frame.unsafeElement.style.borderRadius).toBe('6px');
  });

  it('restores an attachment when detached rendering fails', () => {
    const frame = fk.createFrame();
    const corner = fk.createUICorner({ CornerRadius: 6 });
    let renderMustFail = false;
    const failing = createStyleModifier('Failing', { Name: 'Failing' }, () => {
      if (renderMustFail) throw new Error('derived render failed');
      return {};
    });

    corner.Parent = frame;
    failing.Parent = frame;
    renderMustFail = true;

    expect(() => (corner.Parent = undefined)).toThrow(/Detaching the node failed/);
    expect(corner.Parent).toBe(frame);
    expect(frame.getChildren()).toContain(corner);
  });

  it('rejects non-finite modifier properties at construction', () => {
    expect(() => fk.createUIStroke({ Thickness: Number.NaN })).toThrow(/Thickness.*finite/);
    expect(() => fk.createUICorner({ CornerRadius: Number.POSITIVE_INFINITY })).toThrow(
      /CornerRadius.*finite/,
    );
  });

  it('validates domain-specific modifier values while detached', () => {
    expect(() => fk.createUIScale({ Scale: -1 })).toThrow(/non-negative finite/);
    expect(() => fk.createUICorner({ CornerRadius: -1 })).toThrow(/non-negative finite/);
    expect(() => fk.createUIStroke({ Thickness: -1 })).toThrow(/non-negative finite/);
    expect(() => fk.createUIShadow({ Transparency: 1.1 })).toThrow(/between 0 and 1/);
    expect(() => fk.createUITextStroke({ Thickness: -1 })).toThrow(/non-negative finite/);

    const scale = fk.createUIScale();

    expect(() => scale.setProperties({ Scale: -1 })).toThrow(/non-negative finite/);
    expect(scale.Scale).toBe(1);
  });
});
