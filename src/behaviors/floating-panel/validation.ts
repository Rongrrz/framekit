import {
  assertAllowedValue,
  assertBoolean,
  assertNonNegativeFinite,
} from '#internal/validation.js';
import type { GuiElement } from '#runtime/node/gui-node.js';

import type { PanelOptions } from './types.js';

/** Validates before generated content is allocated or caller-owned content is changed. */
export const validatePanelOptions = (target: GuiElement, options: PanelOptions): void => {
  if (target.isDestroyed()) {
    throw new Error('Floating panel target has been destroyed.');
  }
  if (!target.unsafeElement.ownerDocument.defaultView) {
    throw new Error('Floating panel requires a document with a window.');
  }
  if (options.kind === 'tooltip') {
    assertBoolean(options.followCursor, 'Tooltip followCursor');
  } else {
    assertAllowedValue(options.openOn, ['hover', 'click'], 'Popover openOn');
  }
  if (options.placement !== undefined) {
    assertAllowedValue(
      options.placement,
      ['top', 'bottom', 'left', 'right'],
      'Floating panel placement',
    );
  }
  if (options.gap !== undefined) {
    assertNonNegativeFinite(options.gap, 'Floating panel gap');
  }
  if (options.delay !== undefined) {
    assertNonNegativeFinite(options.delay, 'Floating panel delay');
  }
  for (const hook of [options.onShow, options.onHide]) {
    if (hook !== undefined && typeof hook !== 'function') {
      throw new TypeError('Floating panel hooks must be functions.');
    }
  }
};
