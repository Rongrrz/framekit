import { describe, expect, it, vi } from 'vitest';

import { createObservableValue } from '../../../index.js';

describe('values', () => {
  it('provides the current value and publishes distinct changes', () => {
    const count = createObservableValue(1);
    const listener = vi.fn();
    const unsubscribe = count.onChange(listener);

    expect(Object.isFrozen(count)).toBe(true);

    count.set(2);
    count.set(2);
    count.update((current) => current);
    count.update((current) => current + 3);
    unsubscribe();
    count.set(8);

    expect(count.get()).toBe(8);
    expect(listener.mock.calls).toEqual([[2], [5]]);
  });

  it('stores function values without confusing them with updater functions', () => {
    const first = () => 1;
    const second = () => 2;
    const value = createObservableValue(first);

    value.set(second);

    expect(value.get()).toBe(second);
  });

  it('uses Object.is equality, including NaN and signed zero', () => {
    const value = createObservableValue(Number.NaN);
    const listener = vi.fn();
    value.onChange(listener);
    value.set(Number.NaN);
    value.set(0);
    value.set(-0);
    value.set(-0);
    expect(listener.mock.calls).toEqual([[0], [-0]]);
    expect(Object.is(value.get(), -0)).toBe(true);
  });

  it('reports observer failures without changing a successful update', () => {
    const value = createObservableValue(1);
    const reportError = vi.fn();

    vi.stubGlobal('reportError', reportError);
    value.onChange(() => {
      throw new Error('observer failed');
    });

    expect(() => value.set(2)).not.toThrow();
    expect(value.get()).toBe(2);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'observer failed' }),
    );

    vi.unstubAllGlobals();
  });

  it('leaves state unchanged when an updater throws', () => {
    const value = createObservableValue(1);
    const listener = vi.fn();
    value.onChange(listener);
    expect(() =>
      value.update(() => {
        throw new Error('update failed');
      }),
    ).toThrow(/update failed/);
    expect(value.get()).toBe(1);
    expect(listener).not.toHaveBeenCalled();
  });
});
