import { describe, expect, it } from 'vitest';

import {
  createFrame,
  createImageButton,
  createImageLabel,
  createLink,
  createScreenGui,
  createScrollingFrame,
  createTextArea,
  createTextButton,
  createTextInput,
  createTextLabel,
} from '../../index.js';
import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('DOM ownership', () => {
  it('creates factory DOM and injected styles in the selected document', () => {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const ownerDocument = iframe.contentDocument!;
    const options = { ownerDocument };
    const nodes = [
      createFrame({}, options),
      createTextLabel({}, options),
      createTextButton({}, options),
      createImageLabel({}, options),
      createImageButton({}, options),
      createLink({}, options),
      createScrollingFrame({}, options),
      createTextInput({}, options),
      createTextArea({}, options),
    ];

    for (const node of nodes) {
      expect(node.unsafeElement.ownerDocument).toBe(ownerDocument);
      for (const child of node.unsafeElement.children) {
        expect(child.ownerDocument).toBe(ownerDocument);
      }
      node.destroy();
    }

    expect(ownerDocument.querySelectorAll('[data-framekit-styles]')).toHaveLength(1);
  });

  it('resolves mounts in the selected document and rejects implicit adoption', () => {
    const ownerDocument = document.implementation.createHTMLDocument();
    const target = ownerDocument.body.appendChild(ownerDocument.createElement('main'));
    target.id = 'app';
    const gui = createScreenGui({}, { ownerDocument });
    const frame = createFrame({}, { ownerDocument });

    gui.mount('#app');
    frame.Parent = gui;

    expect(target.firstElementChild).toBe(gui.unsafeElement);
    expect(() => gui.mount(document.body)).toThrow(/different document/);
    expect(() => (createFrame().Parent = frame)).toThrow(/same document/);
    expect(gui.isMounted()).toBe(true);

    gui.destroy();
  });
});
