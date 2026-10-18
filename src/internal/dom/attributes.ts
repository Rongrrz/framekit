/** Saves caller-owned attributes for restoration when a temporary behavior is disposed. */
export const preserveAttributes = (
  element: HTMLElement,
  names: readonly string[],
): (() => void) => {
  const attributes = names.map((name) => [name, element.getAttribute(name)] as const);

  return () => {
    for (const [name, value] of attributes) {
      if (value === null) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
      }
    }
  };
};

/** Writes an optional text attribute, omitting empty values from native markup. */
export const setOptionalAttribute = (element: HTMLElement, name: string, value: string): void => {
  if (value) {
    element.setAttribute(name, value);
  } else {
    element.removeAttribute(name);
  }
};
