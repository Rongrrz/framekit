import type { Instance } from '#internal/runtime/node/instance.js';

import { inspectInstance, type InstanceSnapshot } from './snapshot.js';

export type HierarchyRow = Readonly<{ node: Instance; level: number; snapshot: InstanceSnapshot }>;

/** Search retains ancestor paths and reveals matches even under collapsed nodes. */
export const projectHierarchy = (
  root: Instance,
  collapsed: ReadonlySet<Instance>,
  query: string,
): readonly HierarchyRow[] => {
  const term = query.trim().toLowerCase();
  const all: HierarchyRow[] = [];
  const included = new Set<Instance>();

  const visit = (node: Instance, level: number): void => {
    const snapshot = inspectInstance(node);
    all.push({ node, level, snapshot });

    if (term && `${node.Name} ${snapshot.className}`.toLowerCase().includes(term)) {
      for (let ancestor: Instance | undefined = node; ancestor; ancestor = ancestor.Parent) {
        included.add(ancestor);

        if (ancestor === root) {
          break;
        }
      }
    }

    snapshot.children.forEach((child) => visit(child, level + 1));
  };

  visit(root, 1);

  if (term) {
    return all.filter((row) => included.has(row.node));
  }

  let hiddenBelow = Infinity;

  return all.filter((row) => {
    if (row.level > hiddenBelow) {
      return false;
    }

    hiddenBelow = collapsed.has(row.node) ? row.level : Infinity;

    return true;
  });
};

export const propertyGroup = (name: string): string => {
  if (['Name', 'Enabled', 'Visible', 'DisplayOrder'].includes(name)) {
    return 'Identity';
  }

  if (/Canvas|Scroll/.test(name)) {
    return 'Scrolling';
  }

  if (
    /Size|Position|Anchor|Rotation|Layout|Alignment|Clips|Scale|Padding|Aspect/.test(name) &&
    !name.startsWith('Text')
  ) {
    return 'Layout';
  }

  if (/^Text|^Font|Placeholder/.test(name)) {
    return 'Typography';
  }

  if (/Disabled|Accessible|Input|ReadOnly|AutoComplete|Field|Href|Target|Rel/.test(name)) {
    return 'Interaction';
  }

  return 'Appearance';
};

/** Formats common immutable values for reading, rather than exposing raw JSON everywhere. */
export const formatValue = (value: unknown): Readonly<{ text: string; swatch?: string }> => {
  if (value === undefined) {
    return { text: '—' };
  }

  if (typeof value === 'boolean') {
    return { text: value ? 'True' : 'False' };
  }

  if (typeof value === 'number') {
    return { text: String(Math.round(value * 1000) / 1000) };
  }

  if (typeof value === 'string') {
    return { text: value || '—' };
  }

  if (value && typeof value === 'object') {
    if (
      'R' in value &&
      'G' in value &&
      'B' in value &&
      [value.R, value.G, value.B].every((part) => typeof part === 'number')
    ) {
      const hex = [value.R, value.G, value.B]
        .map((part) => Math.round(Number(part)).toString(16).padStart(2, '0'))
        .join('');

      return { text: `#${hex.toUpperCase()}`, swatch: `#${hex}` };
    }

    if ('Scale' in value && 'Offset' in value) {
      const scale = Number(value.Scale) * 100;

      return {
        text:
          scale === 0
            ? `${formatValue(Number(value.Offset)).text}px`
            : `${Math.round(scale * 100) / 100}% ${Number(value.Offset) < 0 ? '−' : '+'} ${formatValue(Math.abs(Number(value.Offset))).text}px`,
      };
    }

    if ('X' in value && 'Y' in value) {
      return { text: `${formatValue(value.X).text}  /  ${formatValue(value.Y).text}` };
    }
  }

  return { text: JSON.stringify(value) ?? String(value) };
};
