import { fk } from 'framekit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyCommand } from '../src/behaviors/copy-button';

const buttons = new Set<fk.TextButton>();
const createButton = (): fk.TextButton => {
  const button = fk.createTextButton({ Text: 'Copy', BackgroundColor3: fk.color3FromRGB(1, 2, 3) });
  buttons.add(button);
  return button;
};

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => {
  for (const button of buttons) button.destroy();
  buttons.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('copy command feedback', () => {
  it.each(['success', 'rejected', 'unavailable'] as const)(
    'reports %s clipboard writes and restores the idle label without changing colors',
    async (result) => {
      const writeText = vi.fn(async () => {
        if (result === 'rejected') throw new Error('Clipboard denied');
      });
      vi.stubGlobal('navigator', result === 'unavailable' ? {} : { clipboard: { writeText } });
      const button = createButton();

      await copyCommand(button, 'npm install framekit', 'Copy');

      if (result !== 'unavailable') expect(writeText).toHaveBeenCalledWith('npm install framekit');
      expect(button.Text).toBe(result === 'success' ? 'COPIED  ✅' : 'npm install framekit');
      expect(button.BackgroundColor3).toEqual(fk.color3FromRGB(1, 2, 3));
      vi.advanceTimersByTime(1599);
      expect(button.Text).not.toBe('Copy');
      vi.advanceTimersByTime(1);
      expect(button.Text).toBe('Copy');
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('replaces the previous feedback timer on another completed copy', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const button = createButton();
    await copyCommand(button, 'first', 'First idle');
    vi.advanceTimersByTime(800);
    await copyCommand(button, 'second', 'Second idle');
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(800);
    expect(button.Text).toBe('COPIED  ✅');
    vi.advanceTimersByTime(800);
    expect(button.Text).toBe('Second idle');
  });

  it('ignores a clipboard result that arrives after destruction', async () => {
    let finishWrite!: () => void;
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: () =>
          new Promise<void>((resolve) => {
            finishWrite = resolve;
          }),
      },
    });
    const button = createButton();
    const changed = vi.fn();
    button.onPropertyChanged('Text', changed);
    const copying = copyCommand(button, 'command', 'Copy');
    button.destroy();
    finishWrite();
    await expect(copying).resolves.toBeUndefined();
    expect(changed).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels pending feedback when the button is destroyed', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const button = createButton();
    await copyCommand(button, 'command', 'Copy');
    button.destroy();
    expect(vi.getTimerCount()).toBe(0);
    expect(() => vi.runAllTimers()).not.toThrow();
  });
});
