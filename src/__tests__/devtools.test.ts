import { createFrame, createTextButton, createTextInput, spring } from 'framekit';
import {
  bindRuntimeInspector,
  createRuntimeInspector,
  inspectInstance,
  toTreeString,
} from 'framekit/devtools';
import { Window } from 'happy-dom';
import { expect, it, vi } from 'vitest';

it('owns the launcher outside the inspected tree and removes all UI when the binding is disposed', () => {
  const window = new Window({
    url: 'http://localhost/demo?item=2#/guide',
  }) as unknown as globalThis.Window;
  const document = window.document;
  const root = createFrame({ Name: 'Application' }, { ownerDocument: document });
  const binding = bindRuntimeInspector(root);
  expect(root.getChildren()).toEqual([]);
  const launcher = document.querySelector<HTMLButtonElement>('[aria-label="Debug"]')!;
  expect(launcher).not.toBeNull();
  launcher.click();
  expect(window.location.href).toBe('http://localhost/demo?item=2#/guide');
  expect(document.querySelector('[aria-label="FrameKit runtime inspector"]')).not.toBeNull();
  expect(root.getChildren()).toEqual([]);
  binding.dispose();
  expect(document.querySelector('[data-fk-debug]')).toBeNull();
  expect(window.location.href).toBe('http://localhost/demo?item=2#/guide');
  expect(() => binding.open()).toThrow(/disposed/);
  root.destroy();
});

it('formats an ordered hierarchy through devtools without adding debug methods to core nodes', () => {
  const root = createFrame({ Name: 'Root' });
  const first = createFrame({ Name: 'First' });
  const second = createFrame({ Name: 'Second' });
  const grandchild = createFrame({ Name: 'Grandchild' });
  first.Parent = root;
  second.Parent = root;
  grandchild.Parent = first;
  expect(toTreeString(root)).toBe(
    ['Root [Frame]', '├─ First [Frame]', '│  └─ Grandchild [Frame]', '└─ Second [Frame]'].join(
      '\n',
    ),
  );
  expect('toTreeString' in root).toBe(false);
  root.reorderChildren([second, first]);
  expect(toTreeString(root)).toBe(
    ['Root [Frame]', '├─ Second [Frame]', '└─ First [Frame]', '   └─ Grandchild [Frame]'].join(
      '\n',
    ),
  );
  root.destroy();
  expect(() => toTreeString(root)).toThrow(/destroyed/);
});

it('returns readonly snapshots and reports animation claims through destruction', () => {
  const frame = createFrame();
  const child = createTextButton();
  child.Parent = frame;
  spring(child, { Rotation: 30 });
  const snapshot = inspectInstance(child);
  expect(snapshot.parent).toBe(frame);
  expect(snapshot.animatedProperties).toEqual(['Rotation']);
  expect(Object.isFrozen(snapshot.properties)).toBe(true);
  child.Rotation = 12;
  expect(inspectInstance(child).animatedProperties).toEqual([]);
  frame.destroy();
  expect(inspectInstance(child).destroyed).toBe(true);
  expect(inspectInstance(child).cleanupRegistrations).toBe(0);
});

it('redacts password text in snapshots and inspector output without changing the input', () => {
  const password = createTextInput({ InputType: 'Password', Text: 'private-password' });
  const inspector = createRuntimeInspector(password);
  inspector.select(password);

  expect(inspectInstance(password).properties.Text).toBe('[redacted]');
  expect(inspector.gui.unsafeElement.textContent).not.toContain('private-password');
  expect(inspector.gui.unsafeElement.textContent).toContain('[redacted]');
  expect(password.Text).toBe('private-password');
  expect(password.unsafeElement.value).toBe('private-password');
  password.Text = 'replacement-password';
  expect(inspectInstance(password).properties.Text).toBe('[redacted]');
  password.destroy();
  expect(inspectInstance(password).properties.Text).toBe('[redacted]');
});

it('owns the inspector lifetime without adding it to the inspected tree', () => {
  const root = createFrame();
  const child = createTextButton();
  child.Parent = root;
  const inspector = createRuntimeInspector(root);
  inspector.select(child);
  expect(root.getChildren()).toEqual([child]);
  const foreign = createFrame();
  expect(() => inspector.select(foreign)).toThrow(/hierarchy/);
  root.destroy();
  expect(inspector.gui.isDestroyed()).toBe(true);
  foreign.destroy();
});

it('uses the inspected document and removes its styles, picking listeners, and refresh timer', () => {
  vi.useFakeTimers();
  const root = createFrame();
  const inspector = createRuntimeInspector(root);
  expect(inspector.gui.unsafeElement.ownerDocument).toBe(root.unsafeElement.ownerDocument);
  expect(vi.getTimerCount()).toBe(1);
  const styles = [...document.head.querySelectorAll('style')].filter((style) =>
    style.textContent?.includes('[data-fk-debug-panel]'),
  );
  expect(styles).toHaveLength(1);
  inspector.gui.destroy();
  expect(vi.getTimerCount()).toBe(0);
  expect(styles[0]!.isConnected).toBe(false);
  root.destroy();
  vi.useRealTimers();
});

it('keeps a subtree inspector in its own document and does not navigate above its supplied root', () => {
  const iframe = document.body.appendChild(document.createElement('iframe'));
  const ownerDocument = iframe.contentDocument!;
  const outside = createFrame({ Name: 'Outside' }, { ownerDocument });
  const scoped = createFrame({ Name: 'ScopedRoot' }, { ownerDocument });
  scoped.Parent = outside;
  const child = createTextButton({ Name: 'Nested' }, { ownerDocument });
  child.Parent = scoped;
  const inspector = createRuntimeInspector(scoped);
  inspector.gui.mount(ownerDocument.body);
  inspector.select(scoped);
  expect(inspector.gui.unsafeElement.ownerDocument).toBe(ownerDocument);
  expect(
    inspector.gui.unsafeElement.querySelectorAll('[aria-label^="Inspect ancestor"]'),
  ).toHaveLength(0);
  inspector.select(child);
  expect(
    inspector.gui.unsafeElement.querySelectorAll('[aria-label^="Inspect ancestor"]'),
  ).toHaveLength(1);
  expect(() => inspector.select(outside)).toThrow(/hierarchy/);
  outside.destroy();
  expect(inspector.gui.isDestroyed()).toBe(true);
  iframe.remove();
});

it('supports shortcut-only and programmatic bindings with exact modifier matching', () => {
  const root = createFrame();
  const binding = bindRuntimeInspector(root, {
    button: false,
    shortcut: { key: 'd', ctrlKey: true, shiftKey: true },
  });
  expect(document.querySelector('[aria-label="Debug"]')).toBeNull();
  const press = (options: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      key: 'D',
      bubbles: true,
      cancelable: true,
      ...options,
    });
    document.dispatchEvent(event);
    return event;
  };
  press({ ctrlKey: true });
  expect(document.querySelector('[data-fk-debug-panel]')).toBeNull();
  expect(press({ ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  expect(document.querySelector('[data-fk-debug-panel]')).not.toBeNull();
  press({ ctrlKey: true, shiftKey: true, repeat: true });
  expect(document.querySelector('[data-fk-debug-panel]')).not.toBeNull();
  press({ ctrlKey: true, shiftKey: true });
  expect(document.querySelector('[data-fk-debug-panel]')).toBeNull();
  binding.open();
  binding.close();
  binding.dispose();
  expect(press({ ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
  root.destroy();
});

it('protects text editing and handled or composing keys while allowing a modified shortcut in search', () => {
  const root = createFrame();
  const binding = bindRuntimeInspector(root, { button: false, shortcut: { key: 'i' } });
  const input = document.body.appendChild(document.createElement('input'));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', isComposing: true }));
  const handled = new KeyboardEvent('keydown', { key: 'i', cancelable: true });
  handled.preventDefault();
  document.dispatchEvent(handled);
  expect(document.querySelector('[data-fk-debug-panel]')).toBeNull();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
  expect(document.querySelector('[data-fk-debug-panel]')).not.toBeNull();
  binding.dispose();
  const modified = bindRuntimeInspector(root, {
    button: false,
    shortcut: { key: 'i', altKey: true },
  });
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', altKey: true, bubbles: true }));
  expect(document.querySelector('[data-fk-debug-panel]')).not.toBeNull();
  root.destroy();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', altKey: true, bubbles: true }));
  expect(document.querySelector('[data-fk-debug-panel]')).toBeNull();
  modified.dispose();
  input.remove();
});
