import { describe, expect, it } from 'vitest';

import { fk } from '../../index';
import { resetDocumentAfterEach } from '../support/reset-document';

resetDocumentAfterEach();

describe('custom GUI objects', () => {
  it('defines custom GUI classes without exposing runtime internals', () => {
    const createBadge = fk.defineGuiObject({
      className: 'Badge',
      defaultProperties: { Label: 'New' },
      defaultGuiProperties: { Size: fk.udim2FromOffset(80, 24) },
      applyProperties: (element, properties) => {
        element.textContent = properties.Label;
      },
      validate: (properties) => {
        if (properties.Label.length === 0) throw new TypeError('Label must not be empty.');
      },
    });
    const badge = createBadge();

    expect(badge.ClassName).toBe('Badge');
    expect(badge.Name).toBe('Badge');
    expect(badge.Label).toBe('New');
    expect(badge.element.textContent).toBe('New');

    badge.Label = 'Updated';

    expect(badge.element.textContent).toBe('Updated');
    expect(() => badge.setProperties({ Label: '' })).toThrow(/must not be empty/);
    expect(badge.Label).toBe('Updated');
  });

  it('restores custom GUI state and rendering after a property renderer fails', () => {
    const createFragileBadge = fk.defineGuiObject({
      className: 'FragileBadge',
      defaultProperties: { Label: 'Ready' },
      applyProperties: (element, properties) => {
        element.textContent = properties.Label;
        if (properties.Label === 'Rejected') throw new Error('render failed');
      },
    });
    const badge = createFragileBadge();

    expect(() => (badge.Label = 'Rejected')).toThrow(/render failed/);
    expect(badge.Label).toBe('Ready');
    expect(badge.element.textContent).toBe('Ready');
  });

  it('reports both the property failure and a failed rendering rollback', () => {
    let rollbackMustFail = false;
    const createFragileBadge = fk.defineGuiObject({
      className: 'FragileBadge',
      defaultProperties: { Label: 'Ready' },
      applyProperties: (element, properties) => {
        element.textContent = properties.Label;
        if (properties.Label === 'Rejected') {
          rollbackMustFail = true;
          throw new Error('render failed');
        }
        if (rollbackMustFail) throw new Error('rollback failed');
      },
    });
    const badge = createFragileBadge();

    let failure: unknown;
    try {
      badge.Label = 'Rejected';
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([
      expect.objectContaining({ message: 'render failed' }),
      expect.objectContaining({ message: 'rollback failed' }),
    ]);
    expect(badge.Label).toBe('Ready');
    expect(badge.element.textContent).toBe('Ready');
  });
});
