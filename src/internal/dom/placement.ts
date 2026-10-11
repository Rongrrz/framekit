/** Moves an existing element without losing focus or native text selection. */
export const placeElement = (
  parent: HTMLElement,
  element: HTMLElement,
  before: Element | null,
): void => {
  if (element.parentElement === parent && element.nextElementSibling === before) {
    return;
  }
  // Native state-preserving moves also retain embedded browsing and animation state.
  if (
    typeof parent.moveBefore === 'function' &&
    element.parentNode &&
    parent.isConnected === element.isConnected
  ) {
    parent.moveBefore(element, before);
    return;
  }
  const active = element.ownerDocument.activeElement;
  const focused = active && element.contains(active) ? (active as HTMLElement) : undefined;
  const textControl =
    focused?.tagName === 'INPUT' || focused?.tagName === 'TEXTAREA'
      ? (focused as HTMLInputElement | HTMLTextAreaElement)
      : undefined;
  const selection =
    textControl && textControl.selectionStart !== null
      ? {
          start: textControl.selectionStart,
          end: textControl.selectionEnd!,
          direction: textControl.selectionDirection!,
        }
      : undefined;
  parent.insertBefore(element, before);
  if (focused?.isConnected && element.ownerDocument.activeElement !== focused) {
    focused.focus({ preventScroll: true });
    if (selection) {
      textControl!.setSelectionRange(selection.start, selection.end, selection.direction);
    }
  }
};

/** Reconciles the DOM to an ordered sequence, moving only misplaced elements. */
export const placeElements = (parent: HTMLElement, elements: readonly HTMLElement[]): void => {
  let before: HTMLElement | null = null;
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index]!;
    placeElement(parent, element, before);
    before = element;
  }
};
