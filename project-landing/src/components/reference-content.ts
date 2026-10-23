import { animationChapter } from './reference/animation';
import { devtoolsChapter } from './reference/devtools';
import { elementsChapter } from './reference/elements';
import { layoutChapter } from './reference/layout';
import { lifecycleChapter } from './reference/lifecycle';
import { stateChapter } from './reference/state';

export type { ReferenceChapter } from './reference/chapter';

/** The route registry keeps chapter content with the topic that owns it. */
export const referenceChapters = {
  elements: elementsChapter,
  layout: layoutChapter,
  state: stateChapter,
  lifecycle: lifecycleChapter,
  animation: animationChapter,
  devtools: devtoolsChapter,
} as const;
