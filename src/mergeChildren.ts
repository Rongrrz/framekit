import type { ReactElement } from 'react';

import type { NonTextChildren } from './types';

export function mergeChildren(children: NonTextChildren, child: ReactElement): NonTextChildren {
  if (children === null || children === undefined || children === false) {
    return child;
  }

  if (Array.isArray(children)) {
    return [...children, child];
  }

  return [children, child];
}
