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
