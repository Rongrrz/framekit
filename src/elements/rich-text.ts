const droppedElements = new Set([
  'AUDIO',
  'EMBED',
  'IFRAME',
  'IMG',
  'LINK',
  'MATH',
  'META',
  'OBJECT',
  'SCRIPT',
  'STYLE',
  'SVG',
  'TEMPLATE',
  'VIDEO',
]);

/** Renders FrameKit's deliberately small, non-executable rich-text subset. */
export function renderRichText(container: HTMLElement, source: string): void {
  const template = document.createElement('template');
  template.innerHTML = source;
  const fragment = document.createDocumentFragment();
  appendSanitizedChildren(template.content, fragment);
  container.replaceChildren(fragment);
}

/** Converts an editable rich-text DOM back into the supported string format. */
export function richTextString(container: HTMLElement): string {
  return Array.from(container.childNodes, serializeNode).join('');
}

/** Reads visible editable content as ordinary text, retaining authored line breaks. */
export function plainTextString(container: HTMLElement): string {
  return Array.from(container.childNodes, plainTextNode).join('');
}

function appendSanitizedChildren(source: ParentNode, target: ParentNode): void {
  for (const child of Array.from(source.childNodes)) appendSanitizedNode(child, target);
}

function appendSanitizedNode(source: Node, target: ParentNode): void {
  if (source.nodeType === Node.TEXT_NODE) {
    target.append(document.createTextNode(source.textContent ?? ''));
    return;
  }
  if (source.nodeType !== Node.ELEMENT_NODE) return;

  const element = source as HTMLElement;
  if (droppedElements.has(element.tagName)) return;
  const tag = canonicalTag(element.tagName);
  if (tag === 'br') {
    target.append(document.createElement('br'));
    return;
  }
  if (tag) {
    const sanitized = document.createElement(tag);
    appendSanitizedChildren(element, sanitized);
    target.append(sanitized);
    return;
  }
  if (element.tagName === 'FONT') {
    const font = document.createElement('span');
    font.dataset.framekitRichFont = '';
    applyFontAttribute(font, 'color', validColor(element.getAttribute('color')));
    applyFontAttribute(font, 'size', validSize(element.getAttribute('size')));
    applyFontAttribute(font, 'face', validFontFamily(element.getAttribute('face')));
    appendSanitizedChildren(element, font);
    target.append(font);
    return;
  }

  appendSanitizedChildren(element, target);
}

function canonicalTag(tagName: string): 'b' | 'i' | 'u' | 's' | 'br' | undefined {
  if (tagName === 'B' || tagName === 'STRONG') return 'b';
  if (tagName === 'I' || tagName === 'EM') return 'i';
  if (tagName === 'U') return 'u';
  if (tagName === 'S' || tagName === 'STRIKE') return 's';
  if (tagName === 'BR') return 'br';
  return undefined;
}

function applyFontAttribute(
  element: HTMLElement,
  attribute: 'color' | 'size' | 'face',
  value: string | undefined,
): void {
  if (!value) return;
  element.dataset[`framekitRich${capitalize(attribute)}`] = value;
  if (attribute === 'color') element.style.color = value;
  if (attribute === 'size') element.style.fontSize = `${value}px`;
  if (attribute === 'face') element.style.fontFamily = value;
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const element = node as HTMLElement;
  const contents = Array.from(element.childNodes, serializeNode).join('');
  const tag = canonicalTag(element.tagName);
  if (tag === 'br') return '<br>';
  if (tag) return `<${tag}>${contents}</${tag}>`;
  if (element.dataset.framekitRichFont !== undefined) {
    const attributes = (['color', 'size', 'face'] as const)
      .map((name) => {
        const value = element.dataset[`framekitRich${capitalize(name)}`];
        return value ? ` ${name}="${escapeAttribute(value)}"` : '';
      })
      .join('');
    return `<font${attributes}>${contents}</font>`;
  }
  if (element.tagName === 'DIV' || element.tagName === 'P') return `${contents}<br>`;
  return contents;
}

function plainTextNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const element = node as HTMLElement;
  if (element.tagName === 'BR') return '\n';
  const contents = Array.from(element.childNodes, plainTextNode).join('');
  return element.tagName === 'DIV' || element.tagName === 'P' ? `${contents}\n` : contents;
}

function validColor(value: string | null): string | undefined {
  if (!value) return undefined;
  if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)) return value;
  const match = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!match) return undefined;
  const channels = match.slice(1).map(Number);
  return channels.every((channel) => channel <= 255)
    ? `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
    : undefined;
}

function validSize(value: string | null): string | undefined {
  if (!value) return undefined;
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? String(Math.min(size, 256)) : undefined;
}

function validFontFamily(value: string | null): string | undefined {
  if (!value || value.length > 120 || !/^[\w\s,'"-]+$/.test(value)) return undefined;
  return value;
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}
