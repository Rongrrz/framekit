import {
  color3FromHex,
  udim,
  udim2,
  vector2,
  type Color3,
  type UDim,
  type UDim2,
  type Vector2,
} from 'framekit';

import { defaultScriptSource } from './script-source';

/** Values stay compatible with public FrameKit properties and plain JSON. */
export type PropertyValue = string | number | boolean | Color3 | UDim | UDim2 | Vector2;

/** The inspector and import validator share this small, explicit editing vocabulary. */
export type Field = Readonly<{
  kind: 'text' | 'number' | 'boolean' | 'color' | 'udim' | 'udim2' | 'vector2' | 'choice';
  value: PropertyValue;
  min?: number;
  max?: number;
  integer?: boolean;
  choices?: readonly string[];
}>;

type NodeDefinition = Readonly<{
  category: 'container' | 'element' | 'modifier' | 'script';
  fields: Readonly<Record<string, Field>>;
}>;

const number = (value: number, min?: number, max?: number, integer = false): Field => ({
  kind: 'number',
  value,
  ...(min === undefined ? {} : { min }),
  ...(max === undefined ? {} : { max }),
  integer,
});

const choice = (value: string, choices: readonly string[]): Field => ({
  kind: 'choice',
  value,
  choices,
});

const gui = {
  Name: { kind: 'text', value: 'Frame' },
  Position: { kind: 'udim2', value: udim2(0, 32, 0, 32) },
  Size: { kind: 'udim2', value: udim2(0, 240, 0, 140) },
  AnchorPoint: { kind: 'vector2', value: vector2(0, 0) },
  Rotation: number(0),
  Visible: { kind: 'boolean', value: true },
  BackgroundColor3: { kind: 'color', value: color3FromHex('#e3e8f0') },
  BackgroundTransparency: number(0, 0, 1),
  ZIndex: number(1, undefined, undefined, true),
  LayoutOrder: number(0, undefined, undefined, true),
  AutomaticSize: choice('None', ['None', 'X', 'Y', 'XY']),
  ClipsDescendants: { kind: 'boolean', value: false },
} satisfies Record<string, Field>;

const text = {
  ...gui,
  BackgroundTransparency: number(1, 0, 1),
  Text: { kind: 'text', value: 'Hello, FrameKit' },
  TextColor3: { kind: 'color', value: color3FromHex('#24324a') },
  TextSize: number(20, 1, 300),
  FontFamily: { kind: 'text', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  FontWeight: { kind: 'text', value: '400' },
  TextWrapped: { kind: 'boolean', value: true },
  TextXAlignment: choice('Left', ['Left', 'Center', 'Right']),
  TextYAlignment: choice('Center', ['Top', 'Center', 'Bottom']),
} satisfies Record<string, Field>;

/** Supported scene types are deliberately separate from the editor's own interface. */
export const nodeDefinitions = {
  Script: {
    category: 'script',
    fields: {
      Name: { kind: 'text', value: 'Script' },
      Enabled: { kind: 'boolean', value: true },
      Source: { kind: 'text', value: defaultScriptSource },
    },
  },
  Frame: { category: 'container', fields: gui },
  ScrollingFrame: {
    category: 'container',
    fields: {
      ...gui,
      ScrollingDirection: choice('Y', ['X', 'Y', 'XY']),
      AutomaticCanvasSize: choice('Y', ['None', 'X', 'Y', 'XY']),
    },
  },
  TextLabel: { category: 'element', fields: text },
  TextButton: {
    category: 'element',
    fields: {
      ...text,
      BackgroundTransparency: number(0, 0, 1),
      Disabled: { kind: 'boolean', value: false },
      AccessibleLabel: { kind: 'text', value: '' },
    },
  },
  TextInput: {
    category: 'element',
    fields: {
      ...text,
      BackgroundTransparency: number(0, 0, 1),
      Text: { kind: 'text', value: '' },
      PlaceholderText: { kind: 'text', value: 'Type something…' },
      AccessibleLabel: { kind: 'text', value: 'Text input' },
      Disabled: { kind: 'boolean', value: false },
    },
  },
  ImageLabel: {
    category: 'container',
    fields: {
      ...gui,
      Image: { kind: 'text', value: '' },
      AltText: { kind: 'text', value: '' },
      ScaleType: choice('Fit', ['Stretch', 'Fit', 'Crop']),
    },
  },
  UICorner: {
    category: 'modifier',
    fields: {
      Name: { kind: 'text', value: 'Corner' },
      Enabled: { kind: 'boolean', value: true },
      CornerRadius: number(16, 0),
    },
  },
  UIStroke: {
    category: 'modifier',
    fields: {
      Name: { kind: 'text', value: 'Stroke' },
      Enabled: { kind: 'boolean', value: true },
      Color: { kind: 'color', value: color3FromHex('#cbd5e1') },
      Thickness: number(1, 0),
      Transparency: number(0, 0, 1),
      BorderStrokePosition: choice('Inner', ['Inner', 'Center', 'Outer']),
      BorderStrokeSide: choice('All', ['All', 'Top', 'Right', 'Bottom', 'Left']),
    },
  },
  UIListLayout: {
    category: 'modifier',
    fields: {
      Name: { kind: 'text', value: 'List layout' },
      FillDirection: choice('Vertical', ['Horizontal', 'Vertical']),
      Padding: { kind: 'udim', value: udim(0, 12) },
      HorizontalAlignment: choice('Left', ['Left', 'Center', 'Right']),
      VerticalAlignment: choice('Top', ['Top', 'Center', 'Bottom']),
      SortOrder: choice('LayoutOrder', ['LayoutOrder', 'Name']),
      Wraps: { kind: 'boolean', value: false },
    },
  },
  UIPadding: {
    category: 'modifier',
    fields: {
      Name: { kind: 'text', value: 'Padding' },
      PaddingTop: { kind: 'udim', value: udim(0, 16) },
      PaddingRight: { kind: 'udim', value: udim(0, 16) },
      PaddingBottom: { kind: 'udim', value: udim(0, 16) },
      PaddingLeft: { kind: 'udim', value: udim(0, 16) },
    },
  },
  UIShadow: {
    category: 'modifier',
    fields: {
      Name: { kind: 'text', value: 'Shadow' },
      Enabled: { kind: 'boolean', value: true },
      Color: { kind: 'color', value: color3FromHex('#172033') },
      Transparency: number(0.88, 0, 1),
      Offset: { kind: 'vector2', value: vector2(0, 8) },
      BlurRadius: number(24, 0),
      SpreadRadius: number(0),
      Inset: { kind: 'boolean', value: false },
    },
  },
} satisfies Record<string, NodeDefinition>;

/** Keys match the public FrameKit factory suffixes, including element-less modifiers. */
export type NodeType = keyof typeof nodeDefinitions;

/** Widen inferred fields only at lookup so every consumer sees the same schema. */
export const definitionFor = (type: NodeType): NodeDefinition => nodeDefinitions[type];

/** Reject inherited keys such as constructor at the untrusted JSON boundary. */
export const isNodeType = (value: unknown): value is NodeType =>
  typeof value === 'string' && Object.hasOwn(nodeDefinitions, value);

/** New nodes always carry full editable defaults, making reset and undo deterministic. */
export const defaultProperties = (
  type: NodeType,
): Record<string, PropertyValue> & { Name: string } => ({
  ...Object.fromEntries(
    Object.entries(definitionFor(type).fields).map(([name, field]) => [name, field.value]),
  ),
  Name: type,
});

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Normalize only supported values; imported properties never reach a runtime factory unchecked. */
export const validateField = (field: Field, value: unknown, name: string): PropertyValue => {
  const fail = (): never => {
    throw new TypeError(`Invalid ${name}.`);
  };

  switch (field.kind) {
    case 'text':
      if (typeof value !== 'string' || value.length > 100_000) {
        return fail();
      }

      if (name === 'Image' && value) {
        const url = new URL(value, 'https://framekit.local/');

        if (
          !['http:', 'https:', 'blob:'].includes(url.protocol) &&
          !(url.protocol === 'data:' && /^data:image\//i.test(value))
        ) {
          return fail();
        }
      }

      return value;

    case 'choice':
      if (typeof value !== 'string' || !field.choices?.includes(value)) {
        return fail();
      }

      return value;

    case 'boolean':
      return typeof value === 'boolean' ? value : fail();

    case 'number':
      if (
        !finite(value) ||
        (field.min !== undefined && value < field.min) ||
        (field.max !== undefined && value > field.max) ||
        (field.integer && !Number.isInteger(value))
      ) {
        return fail();
      }

      return value;

    case 'color':
      if (
        !record(value) ||
        ![value.R, value.G, value.B].every(
          (channel) =>
            finite(channel) && Number.isInteger(channel) && channel >= 0 && channel <= 255,
        )
      ) {
        return fail();
      }

      return { R: value.R as number, G: value.G as number, B: value.B as number };

    case 'udim':
      if (!record(value) || !finite(value.Scale) || !finite(value.Offset)) {
        return fail();
      }

      return udim(value.Scale, value.Offset);

    case 'vector2':
      if (!record(value) || !finite(value.X) || !finite(value.Y)) {
        return fail();
      }

      return vector2(value.X, value.Y);

    case 'udim2': {
      if (
        !record(value) ||
        !record(value.X) ||
        !record(value.Y) ||
        !finite(value.X.Scale) ||
        !finite(value.X.Offset) ||
        !finite(value.Y.Scale) ||
        !finite(value.Y.Offset)
      ) {
        return fail();
      }

      return udim2(value.X.Scale, value.X.Offset, value.Y.Scale, value.Y.Offset);
    }
  }
};

/** Compound fields use the same comma-separated order in the editor and exported hints. */
export const formatField = (field: Field, value: PropertyValue): string => {
  switch (field.kind) {
    case 'color': {
      const color = value as Color3;
      return `#${[color.R, color.G, color.B].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    }
    case 'udim': {
      const dimension = value as UDim;
      return `${dimension.Scale}, ${dimension.Offset}`;
    }
    case 'vector2': {
      const point = value as Vector2;
      return `${point.X}, ${point.Y}`;
    }
    case 'udim2': {
      const dimensions = value as UDim2;
      return `${dimensions.X.Scale}, ${dimensions.X.Offset}, ${dimensions.Y.Scale}, ${dimensions.Y.Offset}`;
    }
    default:
      return String(value);
  }
};

/** Native editing buffers may be incomplete; callers commit only a successfully parsed value. */
export const parseField = (field: Field, text: string, name: string): PropertyValue => {
  if (field.kind === 'text' || field.kind === 'choice') {
    return validateField(field, text, name);
  }

  if (field.kind === 'color') {
    return color3FromHex(text);
  }

  if (field.kind === 'boolean') {
    return validateField(
      field,
      text === 'true' ? true : text === 'false' ? false : undefined,
      name,
    );
  }

  if (!text.trim()) {
    throw new TypeError(`${name} cannot be empty.`);
  }

  if (field.kind === 'number') {
    return validateField(field, Number(text), name);
  }

  const parts = text.split(',').map((part) => (part.trim() ? Number(part) : Number.NaN));
  const count = field.kind === 'udim2' ? 4 : 2;

  if (parts.length !== count || !parts.every(Number.isFinite)) {
    throw new TypeError(`${name} needs ${count} comma-separated numbers.`);
  }

  const [a, b, c, d] = parts as [number, number, number, number];
  return field.kind === 'udim2'
    ? udim2(a, b, c, d)
    : field.kind === 'udim'
      ? udim(a, b)
      : vector2(a, b);
};
