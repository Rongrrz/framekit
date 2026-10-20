import { color3FromHex, color3ToCss, type Color3 } from '#values/color3.js';

type ColoredSpan = Readonly<{ element: HTMLElement; color: Color3; opacity: number }>;

/** The rendered content owns only safe inline formatting, never caller-supplied HTML. */
export type RichTextContent = Readonly<{
  element: HTMLElement;
  colors: readonly ColoredSpan[];
}>;

const entities: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
]);

/** Supports b, i, u, s, br, and six/eight-digit font colors; unknown markup stays literal. */
export function createRichTextContent(document: Document, source: string): RichTextContent {
  const root = document.createElement('span');
  root.style.minWidth = '0';
  root.style.setProperty(
    '-webkit-text-stroke-color',
    'var(--framekit-text-stroke-color, transparent)',
  );
  root.style.setProperty('-webkit-text-stroke-width', 'var(--framekit-text-stroke-width, 0px)');
  root.style.setProperty('paint-order', 'stroke fill');
  const stack = [{ tag: '', element: root }];
  const colors: ColoredSpan[] = [];
  let offset = 0;

  for (const token of source.matchAll(/<[^>]*>|&(?:[a-z]+|#\d+|#x[\da-f]+);/gi)) {
    const parent = stack.at(-1)!.element;
    parent.append(source.slice(offset, token.index));
    const markup = token[0];
    offset = token.index + markup.length;
    const opening = /^<(b|i|u|s)>$/i.exec(markup);
    const closing = /^<\/(b|i|u|s|font)>$/i.exec(markup);
    const font = /^<font\s+color\s*=\s*(["'])(#[\da-f]{6}(?:[\da-f]{2})?)\1\s*>$/i.exec(markup);

    if (opening || font) {
      const tag = opening?.[1]!.toLowerCase() ?? 'font';
      const element = document.createElement(tag === 'font' ? 'span' : tag);

      if (font) {
        const color = font[2]!;
        colors.push({
          element,
          color: color3FromHex(color.slice(0, 7)),
          opacity: color.length === 9 ? Number.parseInt(color.slice(7), 16) / 255 : 1,
        });
      }

      parent.append(element);
      stack.push({ tag, element });
    } else if (closing && closing[1]!.toLowerCase() === stack.at(-1)!.tag) {
      stack.pop();
    } else if (/^<br\s*\/?>$/i.test(markup)) {
      parent.append('\n');
    } else {
      parent.append(markup[0] === '&' ? decodeEntity(markup) : markup);
    }
  }

  stack.at(-1)!.element.append(source.slice(offset));

  return { element: root, colors };
}

/** Applies text transparency equally to inherited text and explicitly colored spans. */
export function updateRichTextColors(content: RichTextContent, transparency: number): void {
  for (const { element, color, opacity } of content.colors) {
    element.style.color = color3ToCss(color, 1 - (1 - transparency) * opacity);
    element.style.setProperty(
      '-webkit-text-fill-color',
      'var(--framekit-text-gradient-fill, currentcolor)',
    );
  }
}

function decodeEntity(entity: string): string {
  if (entity.startsWith('&#')) {
    const hexadecimal = entity[2]?.toLowerCase() === 'x';
    const value = Number.parseInt(entity.slice(hexadecimal ? 3 : 2, -1), hexadecimal ? 16 : 10);

    return value > 0 && value <= 0x10ffff && (value < 0xd800 || value > 0xdfff)
      ? String.fromCodePoint(value)
      : '\uFFFD';
  }

  return entities.get(entity.slice(1, -1)) ?? entity;
}
