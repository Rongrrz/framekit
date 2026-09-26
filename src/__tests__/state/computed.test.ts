import { createComputedValue, createObservableValue } from 'framekit';
import { describe, expect, it, vi } from 'vitest';

describe('computed values', () => {
  it('derives a readonly value from explicit dependencies', () => {
    const price = createObservableValue(4);
    const quantity = createObservableValue(3);
    const total = createComputedValue([price, quantity], () => price.get() * quantity.get());
    const listener = vi.fn();
    const unsubscribe = total.onChange(listener);

    expect(Object.isFrozen(total)).toBe(true);
    expect(total.get()).toBe(12);

    price.set(5);
    quantity.set(2);
    unsubscribe();
    price.set(10);

    expect(listener.mock.calls).toEqual([[15], [10]]);
    expect(total.get()).toBe(20);
  });

  it('publishes only distinct derived values using Object.is equality', () => {
    const count = createObservableValue(1);
    const parity = createComputedValue([count], () => count.get() % 2);
    const listener = vi.fn();
    parity.onChange(listener);

    count.set(3);
    count.set(4);
    count.set(6);

    expect(listener.mock.calls).toEqual([[0]]);
  });

  it('observes dependencies only while the computed value has listeners', () => {
    const count = createObservableValue(1);
    const derive = vi.fn(() => count.get() * 2);
    const doubled = createComputedValue([count], derive);

    expect(derive).not.toHaveBeenCalled();
    expect(doubled.get()).toBe(2);
    expect(derive).toHaveBeenCalledTimes(1);

    const firstUnsubscribe = doubled.onChange(() => undefined);
    const secondUnsubscribe = doubled.onChange(() => undefined);
    expect(derive).toHaveBeenCalledTimes(2);

    count.set(2);
    expect(derive).toHaveBeenCalledTimes(3);
    expect(doubled.get()).toBe(4);
    expect(derive).toHaveBeenCalledTimes(3);

    firstUnsubscribe();
    secondUnsubscribe();
    count.set(3);
    expect(derive).toHaveBeenCalledTimes(3);
    expect(doubled.get()).toBe(6);
    expect(derive).toHaveBeenCalledTimes(4);
  });

  it('supports computed values as dependencies', () => {
    const count = createObservableValue(2);
    const doubled = createComputedValue([count], () => count.get() * 2);
    const label = createComputedValue([doubled], () => `Total: ${doubled.get()}`);
    const listener = vi.fn();
    label.onChange(listener);

    count.set(3);

    expect(label.get()).toBe('Total: 6');
    expect(listener).toHaveBeenCalledWith('Total: 6');
  });

  it('reports listener failures without losing the derived update', () => {
    const count = createObservableValue(1);
    const doubled = createComputedValue([count], () => count.get() * 2);
    const reportError = vi.fn();

    vi.stubGlobal('reportError', reportError);
    doubled.onChange(() => {
      throw new Error('observer failed');
    });

    expect(() => count.set(2)).not.toThrow();
    expect(doubled.get()).toBe(4);
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'observer failed' }),
    );

    vi.unstubAllGlobals();
  });
});
