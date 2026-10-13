import { describe, expect, it } from 'vitest';

import { snapshotPropertyValue } from '#internal/snapshot.js';

describe('immutable property snapshots', () => {
  it('reuses fully frozen data while copying mutable children on each call', () => {
    const frozen = Object.freeze({ point: Object.freeze({ x: 1 }) });
    expect(snapshotPropertyValue(frozen)).toBe(frozen);
    expect(snapshotPropertyValue(frozen)).toBe(frozen);

    const child = { x: 1 };
    const shallowFrozen = Object.freeze({ child });
    const first = snapshotPropertyValue(shallowFrozen);
    child.x = 2;
    const second = snapshotPropertyValue(shallowFrozen);
    expect(first.child.x).toBe(1);
    expect(second.child.x).toBe(2);
    expect(Object.isFrozen(first.child)).toBe(true);
  });

  it('does not mistake a frozen cycle containing a mutable descendant for immutable data', () => {
    const mutable = { x: 1 };
    type First = { next?: Second; mutable: typeof mutable };
    type Second = { next: First };
    const first: First = { mutable };
    const second: Second = { next: first };
    first.next = second;
    Object.freeze(first);
    Object.freeze(second);
    const snapshot = snapshotPropertyValue(first);
    mutable.x = 2;
    const next = snapshotPropertyValue(second);
    expect(snapshot.next!.next).toBe(snapshot);
    expect(snapshot.mutable.x).toBe(1);
    expect(next.next.mutable.x).toBe(2);
    expect(Object.isFrozen(next.next.mutable)).toBe(true);
  });

  it('evaluates frozen accessors again for a new snapshot and never retains live getters', () => {
    let current = 1;
    const source = Object.freeze({
      get value() {
        return current;
      },
    });
    const first = snapshotPropertyValue(source);
    current = 2;
    const second = snapshotPropertyValue(source);
    expect(first.value).toBe(1);
    expect(second.value).toBe(2);
  });
});
