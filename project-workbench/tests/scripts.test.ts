import { createFrame } from 'framekit';
import { afterEach, expect, it, vi } from 'vitest';

import { parseDocument, parseNetworkOrigins, validateHierarchy } from '../src/document';
import { createEditor } from '../src/editor';
import { defaultProperties } from '../src/schema';
import { mountScript } from '../src/script-context';

afterEach(() => vi.useRealTimers());

it('owns scripts under buttons or at scene root through copy, move, undo and persistence', () => {
  const editor = createEditor();
  editor.select('button');
  editor.add('Script');
  const script = editor.state.get().document.nodes.find((node) => node.type === 'Script')!;
  expect(script.parent).toBe('button');
  editor.edit(script.id, 'Source', 'export default () => {};');
  editor.duplicate();
  expect(editor.state.get().document.nodes.filter((node) => node.type === 'Script')).toHaveLength(
    2,
  );
  editor.reparent(script.id, null);
  expect(editor.state.get().document.nodes.find((node) => node.id === script.id)?.parent).toBe(
    null,
  );
  editor.undo();
  expect(editor.state.get().document.nodes.find((node) => node.id === script.id)?.parent).toBe(
    'button',
  );
  expect(parseDocument(JSON.stringify(editor.state.get().project))).toEqual(
    editor.state.get().project,
  );
  expect(() =>
    validateHierarchy({
      ...editor.state.get().project,
      nodes: [
        script,
        {
          id: 'child',
          parent: script.id,
          type: 'Frame',
          properties: defaultProperties('Frame'),
        },
      ],
    }),
  ).toThrow();
});

it('cleans listeners, timers, created objects and late async cleanup when the parent dies', async () => {
  vi.useFakeTimers();
  const parent = createFrame();
  const owned = createFrame();
  const event = new EventTarget();
  const callback = vi.fn();
  const cleanup = vi.fn();
  const errors = vi.fn();
  let finish!: (cleanup: () => void) => void;
  mountScript(
    (ctx) => {
      ctx.own(owned);
      ctx.own(() => {
        throw new Error('cleanup failed');
      });
      ctx.listen(event, 'click', callback);
      ctx.interval(callback, 20);
      ctx.timeout(callback, 50);
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    parent,
    parent,
    new Map(),
    [],
    errors,
  );
  event.dispatchEvent(new Event('click'));
  expect(callback).toHaveBeenCalledTimes(1);
  parent.destroy();
  finish(cleanup);
  await Promise.resolve();
  event.dispatchEvent(new Event('click'));
  vi.advanceTimersByTime(100);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(owned.isDestroyed()).toBe(true);
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(errors).toHaveBeenCalledTimes(1);
});

it('validates backend permissions and prevents unauthorised managed requests', async () => {
  expect(parseNetworkOrigins(['https://api.example.com', 'https://api.example.com'])).toEqual([
    'https://api.example.com',
  ]);
  for (const origin of [
    '*',
    'https://api.test; script-src *',
    'https://user:pass@api.test',
    'https://api.test/path',
    'data:text/plain,a',
  ]) {
    expect(() => parseNetworkOrigins([origin])).toThrow();
  }
  const parent = createFrame();
  const errors = vi.fn();
  mountScript(
    async (ctx) => {
      await ctx.fetch('https://api.example.com');
    },
    parent,
    parent,
    new Map(),
    [],
    errors,
  );
  await vi.waitFor(() => expect(errors).toHaveBeenCalledTimes(1));
  parent.destroy();
});
