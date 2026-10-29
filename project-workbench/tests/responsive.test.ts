import { createFrame, udim2FromOffset } from 'framekit';
import { expect, it } from 'vitest';

import { parseDocument, type SceneDocument } from '../src/document';
import { createEditor } from '../src/editor';
import { createScenePreview } from '../src/preview';
import { breakpointForWidth } from '../src/responsive';
import { projectTemplates } from '../src/templates';

it('inherits shared properties, edits only the chosen device, and supports reset, undo, and persistence', () => {
  const editor = createEditor();
  editor.select('headline');
  editor.setLayout('phone');
  editor.edit('headline', 'TextSize', 24);
  editor.edit('headline', 'Position', udim2FromOffset(16, 32));
  const phone = editor.state.get().project;
  const headline = phone.nodes.find((node) => node.id === 'headline')!;
  expect(headline.properties.TextSize).toBe(38);
  expect(headline.responsive?.phone?.TextSize).toBe(24);
  expect(parseDocument(JSON.stringify(phone))).toEqual(phone);
  editor.setLayout('desktop');
  editor.edit('headline', 'Visible', false);
  editor.undo();
  expect(
    editor.state.get().document.nodes.find((node) => node.id === 'headline')!.responsive,
  ).toEqual(headline.responsive);
  editor.setLayout('phone');
  editor.resetLayout();
  expect(
    editor.state.get().document.nodes.find((node) => node.id === 'headline')!.responsive?.phone,
  ).toBeUndefined();
  editor.undo();
  expect(
    editor.state.get().document.nodes.find((node) => node.id === 'headline')!.responsive?.phone
      ?.TextSize,
  ).toBe(24);
});

it('rejects unsupported breakpoints and invalid device properties when importing', () => {
  const document = createEditor().state.get().project;
  const invalid = (responsive: unknown): string =>
    JSON.stringify({
      ...document,
      nodes: document.nodes.map((node, index) => (index ? node : { ...node, responsive })),
    });
  expect(() => parseDocument(invalid({ watch: { Visible: false } }))).toThrow('breakpoint');
  expect(() => parseDocument(invalid({ phone: { TextSize: -1 } }))).toThrow();
  expect(() => parseDocument(invalid({ phone: { Name: 'Different identity' } }))).toThrow(
    'responsive property',
  );
});

it('switches responsive layouts at their exact boundaries and restores shared values without replacing handles', () => {
  expect([599, 600, 1023, 1024].map(breakpointForWidth)).toEqual([
    'phone',
    'tablet',
    'tablet',
    'desktop',
  ]);
  const editor = createEditor();
  editor.setLayout('phone');
  editor.edit('headline', 'TextSize', 22);
  const canvas = createFrame();
  const preview = createScenePreview(canvas);
  const document = editor.state.get().document;
  preview.update({ ...document, width: 390 }, 'headline');
  const headline = canvas.unsafeElement.querySelector('[data-scene-id="headline"]')!;
  expect((headline as HTMLElement).style.fontSize).toBe('22px');
  preview.update({ ...document, width: 1440 }, 'headline');
  expect(canvas.unsafeElement.querySelector('[data-scene-id="headline"]')).toBe(headline);
  expect((headline as HTMLElement).style.fontSize).toBe('38px');
  canvas.destroy();
});

it('ships distinct, portable templates with named hierarchies, reusable controls, and phone layouts', () => {
  for (const template of projectTemplates.filter((entry) => entry.id !== 'blank')) {
    const document: SceneDocument = template.create();
    expect(document.prefabs?.length).toBeGreaterThan(0);
    expect(document.nodes.some((node) => node.responsive?.phone)).toBe(true);
    expect(parseDocument(JSON.stringify(document))).toEqual(document);
    const canvas = createFrame();
    const preview = createScenePreview(canvas);
    preview.update({ ...document, width: 390 }, null);
    expect(canvas.unsafeElement.querySelectorAll('[data-scene-id]').length).toBeGreaterThan(0);
    canvas.destroy();
  }
});
