import {
  createFrame,
  createScreenGui,
  createTextLabel,
  createUIListLayout,
  udim2FromOffset,
} from 'framekit';

const styleOf = (element) =>
  Object.fromEntries(
    Array.from(element.style, (key) => [
      key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
      element.style.getPropertyValue(key),
    ]),
  );
const templates = new Map();

export function getTemplate(count, text) {
  const key = `${count}:${text}`;
  if (templates.has(key)) {
    return templates.get(key);
  }
  const root = createScreenGui();
  const parent = createFrame({ Size: udim2FromOffset(800, count * 10) });
  const row = (text ? createTextLabel : createFrame)({ Size: udim2FromOffset(800, 10) });
  parent.Parent = root;
  row.Parent = parent;
  const plainParent = styleOf(parent.unsafeElement);
  createUIListLayout().Parent = parent;
  const result = {
    root: styleOf(root.unsafeElement),
    plainParent,
    parent: styleOf(parent.unsafeElement),
    row: styleOf(row.unsafeElement),
    text: text ? styleOf(row.unsafeElement.firstElementChild) : null,
  };
  root.destroy();
  templates.set(key, result);
  return result;
}
