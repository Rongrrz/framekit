/** Selects the browser document that owns newly created DOM. */
export type DomOptions = Readonly<{ ownerDocument?: Document }>;

export function resolveOwnerDocument(options: DomOptions): Document {
  const ownerDocument = options.ownerDocument ?? globalThis.document;
  if (!ownerDocument) {
    throw new Error('Creating a GUI node requires an ownerDocument.');
  }
  return ownerDocument;
}

/** Creates DOM helpers in the same realm as their element when possible. */
export function createRealmAbortController(element: Element): AbortController {
  const AbortControllerConstructor = element.ownerDocument.defaultView?.AbortController;
  return AbortControllerConstructor ? new AbortControllerConstructor() : new AbortController();
}
