import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import {
  assertBoolean,
  assertFiniteNumber,
  assertInteger,
  assertPositiveFinite,
  assertString,
} from '#internal/validation.js';

/** Persistent semantic information. Omitted fields stay unchanged; null removes a field. */
export type AccessibilityProperties = {
  role?: string | null;
  label?: string | null;
  description?: string | null;
  level?: number | null;
  expanded?: boolean | null;
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time' | null;
  controls?: GuiElement | null;
  labelledBy?: GuiElement | null;
  describedBy?: GuiElement | null;
  valueMin?: number | null;
  valueMax?: number | null;
  valueNow?: number | null;
  valueText?: string | null;
  orientation?: 'horizontal' | 'vertical' | null;
  /** True joins the tab order; false allows programmatic focus only. */
  focusable?: boolean | null;
};

const attributes = {
  role: 'role',
  label: 'aria-label',
  description: 'aria-description',
  level: 'aria-level',
  expanded: 'aria-expanded',
  current: 'aria-current',
  controls: 'aria-controls',
  labelledBy: 'aria-labelledby',
  describedBy: 'aria-describedby',
  valueMin: 'aria-valuemin',
  valueMax: 'aria-valuemax',
  valueNow: 'aria-valuenow',
  valueText: 'aria-valuetext',
  orientation: 'aria-orientation',
  focusable: 'tabindex',
} as const;

let nextId = 0;

/** Sets native semantics without exposing DOM attributes or requiring callers to manage IDs. */
export const setAccessibility = (node: GuiElement, patch: AccessibilityProperties): void => {
  if (node.isDestroyed()) {
    throw new Error('Accessibility requires a live GUI object.');
  }

  const element = node.unsafeElement;
  const entries = Object.entries(patch) as [
    keyof AccessibilityProperties,
    AccessibilityProperties[keyof AccessibilityProperties],
  ][];

  // Validate the whole patch before changing semantics or allocating relationship IDs.
  for (const [key, value] of entries) {
    if (!Object.hasOwn(attributes, key)) {
      throw new TypeError(`Unknown accessibility property: ${key}.`);
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (key === 'controls' || key === 'labelledBy' || key === 'describedBy') {
      const related = value as GuiElement;

      if (related.isDestroyed() || related.unsafeElement.ownerDocument !== element.ownerDocument) {
        throw new TypeError(
          'Accessibility relationships require live GUI objects in the same document.',
        );
      }
    } else if (key === 'expanded' || key === 'focusable') {
      assertBoolean(value, key);
    } else if (key === 'level') {
      assertPositiveFinite(value, key);
      assertInteger(value, key);
    } else if (key === 'valueMin' || key === 'valueMax' || key === 'valueNow') {
      assertFiniteNumber(value, key);
    } else if (key === 'current') {
      if (
        ![true, false, 'page', 'step', 'location', 'date', 'time'].includes(
          value as string | boolean,
        )
      ) {
        throw new TypeError('Unknown accessibility current value.');
      }
    } else {
      assertString(value, key);

      if (key === 'orientation' && value !== 'horizontal' && value !== 'vertical') {
        throw new TypeError('Unknown accessibility orientation.');
      }
    }
  }

  for (const [key, value] of entries) {
    if (value === undefined) {
      continue;
    }

    // Controls already expose a label property; keep that property authoritative.
    if (key === 'label' && 'AccessibleLabel' in node) {
      (node as GuiElement & { AccessibleLabel: string }).AccessibleLabel =
        (value as string | null) ?? '';

      continue;
    }

    const attribute = attributes[key];

    if (value === null) {
      element.removeAttribute(attribute);
    } else if (key === 'controls' || key === 'labelledBy' || key === 'describedBy') {
      const related = (value as GuiElement).unsafeElement;

      if (!related.id) {
        let id: string;

        do {
          nextId += 1;
          id = `framekit-accessible-${nextId}`;
        } while (element.ownerDocument.getElementById(id));

        related.id = id;
      }

      element.setAttribute(attribute, related.id);
    } else {
      element.setAttribute(attribute, key === 'focusable' ? (value ? '0' : '-1') : String(value));
    }
  }
};
