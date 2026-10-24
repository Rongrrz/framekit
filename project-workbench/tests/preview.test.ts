import { createFrame, createUIScale } from 'framekit';
import { describe, expect, it } from 'vitest';

import { destroyNodesAfterEach } from '../../src/__tests__/support/node-cleanup';
import { createSampleDocument } from '../src/document';
import { createEditor } from '../src/editor';
import { createScenePreview } from '../src/preview';
import { nodeDefinitions } from '../src/schema';

const own = destroyNodesAfterEach();

describe('Workbench preview', () => {
  it('renders the sample and every supported node with public factories', () => {
    const canvas = own(createFrame());
    const preview = createScenePreview(canvas);
    const editor = createEditor();
    preview.update(editor.state.get().document, 'card');

    for (const type of Object.keys(nodeDefinitions) as (keyof typeof nodeDefinitions)[]) {
      editor.select(null);
      editor.add('Frame');
      editor.add(type);
      preview.update(editor.state.get().document, editor.state.get().selectedId);
      expect(canvas.getDescendants().findLast((node) => node.Name === type)?.ClassName).toBe(type);
    }
  });

  it('preserves handles across edits and ownership reversal, and keeps editor decorations', () => {
    const canvas = own(createFrame());
    const scale = createUIScale();
    scale.Parent = canvas;
    const preview = createScenePreview(canvas);
    const editor = createEditor();
    preview.update(editor.state.get().document, 'card');
    const headline = canvas.findFirstChild('Headline', true);
    const feature = canvas.findFirstChild('Feature panel', true);
    const card = canvas.findFirstChild('Welcome card', true);
    editor.edit('headline', 'Text', 'Still the same object');
    preview.update(editor.state.get().document, 'headline');
    expect(canvas.findFirstChild('Headline', true)).toBe(headline);

    editor.reparent('feature', null);
    editor.reparent('card', 'feature');
    preview.update(editor.state.get().document, 'card');
    expect(canvas.findFirstChild('Feature panel', true)).toBe(feature);
    expect(card?.Parent).toBe(feature);
    expect(scale.Parent).toBe(canvas);
  });

  it('retains moved descendants when an imported document deletes their old owner', () => {
    const canvas = own(createFrame());
    const preview = createScenePreview(canvas);
    const sample = createSampleDocument();
    preview.update(sample, null);
    const headline = canvas.findFirstChild('Headline', true);
    preview.update(
      {
        ...sample,
        nodes: [{ ...sample.nodes.find((node) => node.id === 'headline')!, parent: null }],
      },
      'headline',
    );
    expect(canvas.findFirstChild('Headline', true)).toBe(headline);
    expect(headline?.Parent).toBe(canvas);
    expect(canvas.findFirstChild('Welcome card', true)).toBeUndefined();
  });
});

describe('Prefab event preview', () => {
  it('runs internal native handlers before handlers on the placed instance, as exported factories do', () => {
    const canvas = own(createFrame());
    const editor = createEditor();
    editor.select('button');
    const prefab = editor.createPrefab('Action');
    editor.openPrefab(prefab);
    editor.connect({
      id: 'change-button',
      source: 'button',
      event: 'Activated',
      action: { type: 'set', target: 'button', property: 'Text', value: 'Internal handler ran' },
    });
    editor.openPrefab(null);
    editor.connect({
      id: 'read-button',
      source: 'button',
      event: 'Activated',
      action: { type: 'copyText', source: 'button', target: 'headline' },
    });
    const preview = createScenePreview(canvas);
    preview.update(editor.state.get().project, null);
    preview.setInteractive(true);
    const button = canvas.findFirstChild('Get started', true)!;
    const headline = canvas.findFirstChild('Headline', true)!;

    if (button.isA('TextButton') && headline.isA('TextLabel')) {
      button.unsafeElement.click();
      expect(headline.Text).toBe('Internal handler ran');
    }
  });

  it('runs prefab output connections in Preview and restores authored values when returning to Design', () => {
    const canvas = own(createFrame());
    const editor = createEditor();
    editor.select('button');
    const prefab = editor.createPrefab('Action');
    editor.openPrefab(prefab);
    editor.setEvents(['Pressed']);
    editor.connect({
      id: 'emit',
      source: 'button',
      event: 'Activated',
      action: { type: 'emit', event: 'Pressed' },
    });
    editor.openPrefab(null);
    editor.connect({
      id: 'respond',
      source: 'button',
      event: 'Pressed',
      action: { type: 'set', target: 'headline', property: 'Text', value: 'Button works' },
    });
    const preview = createScenePreview(canvas);
    preview.update(editor.state.get().project, 'button');
    const button = canvas.findFirstChild('Get started', true)!;
    const headline = canvas.findFirstChild('Headline', true)!;
    expect(button.isA('TextButton')).toBe(true);
    expect(headline.isA('TextLabel')).toBe(true);

    if (button.isA('TextButton') && headline.isA('TextLabel')) {
      button.unsafeElement.click();
      expect(headline.Text).toBe('Make something persistent.');
      preview.setInteractive(true);
      button.unsafeElement.click();
      expect(headline.Text).toBe('Button works');
      preview.setInteractive(false);
      preview.update(editor.state.get().project, 'button', true);
      expect(headline.Text).toBe('Make something persistent.');
    }
  });

  it('keeps nested prefab outputs isolated between separate placed instances', () => {
    const canvas = own(createFrame());
    const editor = createEditor();
    editor.select('button');
    const child = editor.createPrefab('Button');
    editor.openPrefab(child);
    editor.setEvents(['Pressed']);
    editor.connect({
      id: 'emit',
      source: 'button',
      event: 'Activated',
      action: { type: 'emit', event: 'Pressed' },
    });
    editor.openPrefab(null);
    editor.connect({
      id: 'increment',
      source: 'button',
      event: 'Pressed',
      action: { type: 'increment', target: 'headline', amount: 1 },
    });
    editor.select('card');
    const parent = editor.createPrefab('Panel');
    editor.select(null);
    editor.insertPrefab(parent);
    const preview = createScenePreview(canvas);
    preview.update(editor.state.get().project, null);
    preview.setInteractive(true);
    const panels = canvas
      .getChildren()
      .filter((node) => node.Name === 'Welcome card' || node.Name === 'Panel');
    expect(panels).toHaveLength(2);
    const first = panels[0]!;
    const second = panels[1]!;
    const button = first.findFirstChild('Get started', true)!;
    const firstHeading = first.findFirstChild('Headline', true)!;
    const secondHeading = second.findFirstChild('Headline', true)!;

    if (
      button.isA('TextButton') &&
      firstHeading.isA('TextLabel') &&
      secondHeading.isA('TextLabel')
    ) {
      button.unsafeElement.click();
      expect(firstHeading.Text).toBe('1');
      expect(secondHeading.Text).toBe('Make something persistent.');
    }
  });
});
