import { orderedNodes, type SceneDocument } from './document';

/** Export uses generated identifiers and JSON literals, never executable user-provided names. */
export const exportTypeScript = (document: SceneDocument): string => {
  const nodes = orderedNodes(document);
  const factories = [...new Set(nodes.map((node) => `create${node.type}`))].sort();
  const identifiers = new Map(nodes.map((node, index) => [node.id, `node${index + 1}`]));
  const lines = [
    `import { createScreenGui, createFrame, udim2FromOffset${factories
      .filter((name) => name !== 'createFrame')
      .map((name) => `, ${name}`)
      .join('')} } from 'framekit';`,
    '',
    'const app = createScreenGui();',
    `const canvas = createFrame({ Name: ${JSON.stringify(document.name)}, Size: udim2FromOffset(${document.width}, ${document.height}), BackgroundColor3: { R: 243, G: 246, B: 243 } });`,
    'canvas.Parent = app;',
    '',
  ];

  for (const node of nodes) {
    const identifier = identifiers.get(node.id)!;
    lines.push(
      `const ${identifier} = create${node.type}(${JSON.stringify(node.properties, null, 2)});`,
    );
    lines.push(
      `${identifier}.Parent = ${node.parent === null ? 'canvas' : identifiers.get(node.parent)};`,
      '',
    );
  }

  lines.push(
    "app.mount('#app');",
    '',
    '// Call app.destroy() when the surrounding application is disposed.',
    '',
  );
  return lines.join('\n');
};
