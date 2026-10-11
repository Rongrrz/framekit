/** Native text editing keeps its keyboard behavior inside composite controls. */
export const isTextEntry = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  return Boolean(
    element &&
    (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable),
  );
};

/** Buffered typeahead with repeated-letter cycling and no timer resources. */
export const createTypeahead = (): ((
  labels: readonly string[],
  current: number,
  event: KeyboardEvent,
) => number | undefined) => {
  let prefix = '';
  let lastTime = 0;
  return (labels, current, event) => {
    if (
      event.key.length !== 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.isComposing
    ) {
      return undefined;
    }
    const now = performance.now();
    prefix = (now - lastTime > 700 ? '' : prefix) + event.key.toLocaleLowerCase();
    lastTime = now;
    const query = [...prefix].every((letter) => letter === prefix[0]) ? prefix[0]! : prefix;
    for (let offset = 1; offset <= labels.length; offset += 1) {
      const index = (current + offset) % labels.length;
      if (labels[index]!.trim().toLocaleLowerCase().startsWith(query)) {
        return index;
      }
    }
    return undefined;
  };
};
