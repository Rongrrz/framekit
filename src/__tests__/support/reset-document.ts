import { afterEach } from 'vitest';

/** Resets document state after every test in the importing suite. */
export function resetDocumentAfterEach(): void {
  afterEach(() => document.body.replaceChildren());
}
