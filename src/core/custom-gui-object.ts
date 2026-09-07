import type { PropertyValidator } from '../runtime/node-state';
import { assertString } from '../runtime/validation';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObject,
  type GuiObjectProperties,
} from './gui-object';

/** Description used to create one reusable GUI class. */
export type GuiObjectDefinition<Properties extends object> = {
  /** ClassName shown in the FrameKit hierarchy and debug output. */
  className: string;
  /** Defaults for the properties unique to this class. */
  defaultProperties: Properties;
  /** Optional overrides for ordinary GUI defaults such as Size or BackgroundColor3. */
  defaultGuiProperties?: Partial<Omit<GuiObjectProperties, 'Name'>>;
  /** Creates the backing element. Defaults to a div. */
  createElement?: () => HTMLElement;
  /** Applies the current custom properties to the backing element. */
  applyProperties?: (
    element: HTMLElement,
    properties: Readonly<GuiObjectProperties & Properties>,
    changedProperties: ReadonlySet<keyof (GuiObjectProperties & Properties)>,
  ) => void;
  /** Rejects invalid custom property combinations. */
  validate?: PropertyValidator<GuiObjectProperties & Properties>;
};

/** Constructor returned by defineGuiObject. */
export type GuiObjectConstructor<Properties extends object> = (
  initialProperties?: Partial<GuiObjectProperties & Properties>,
) => GuiObject<GuiObjectProperties & Properties>;

/** Defines a reusable GUI class without exposing FrameKit runtime internals. */
export function defineGuiObject<Properties extends object>(
  definition: GuiObjectDefinition<Properties>,
): GuiObjectConstructor<Properties> {
  validateDefinition(definition);

  const className = definition.className;
  const defaultProperties = Object.freeze({ ...definition.defaultProperties });
  const defaultGuiProperties = Object.freeze({ ...definition.defaultGuiProperties });
  const createElement = definition.createElement ?? (() => document.createElement('div'));
  const applyProperties = definition.applyProperties;
  const validate = definition.validate;

  return (initialProperties = {}) => {
    const element = createElement();
    const defaults = {
      ...createDefaultGuiObjectProperties(),
      ...defaultGuiProperties,
      ...defaultProperties,
      Name: className,
    } as GuiObjectProperties & Properties;

    return createGuiObjectNode({
      className,
      element,
      defaultProperties: defaults,
      initialProperties,
      renderProperties: (properties, changedProperties) => {
        applyProperties?.(element, properties, changedProperties);
      },
      validateProperties: validate,
    });
  };
}

function validateDefinition<Properties extends object>(
  definition: GuiObjectDefinition<Properties>,
): void {
  assertString(definition.className, 'className');
  if (definition.className.trim().length === 0) {
    throw new TypeError('className must not be empty.');
  }

  const guiPropertyNames = new Set(Object.keys(createDefaultGuiObjectProperties()));
  for (const property of Object.keys(definition.defaultProperties)) {
    if (guiPropertyNames.has(property)) {
      throw new TypeError(
        `Custom property "${property}" conflicts with a built-in GUI property. Use defaultGuiProperties to override it.`,
      );
    }
  }
}
