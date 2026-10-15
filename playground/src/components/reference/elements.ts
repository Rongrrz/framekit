import type { ReferenceChapter } from './chapter';

export const elementsChapter = {
  title: 'Elements & input',
  summary:
    'Choose a native element for its behavior. Every factory returns a persistent, typed instance; creating one does not mount it.',
  sections: [
    {
      title: 'Choose the right primitive',
      body: 'ScreenGui is a full-viewport root. Frame is a container. TextLabel displays text; TextButton is a native button. Link is a native anchor. TextInput and TextArea preserve browser editing. ImageLabel and ImageButton display images; ScrollingFrame owns native scrolling.',
      code: [
        "import { createFrame, createTextLabel } from 'framekit';",
        '',
        "const card = createFrame({ Name: 'Profile', TagName: 'section' });",
        'const title = createTextLabel({',
        "  Text: 'Your profile', TextSize: 24, TextTagName: 'h2',",
        '});',
        'title.Parent = card;',
      ],
      note: 'Choose TagName alongside the initial properties for Frame, ScrollingFrame, and ImageLabel; TextLabel uses TextTagName for its inner text element. Tags are fixed after creation. Frame supports section, article, nav, aside, header, footer, figure, main, dialog, and div.',
    },
    {
      title: 'Native text editing',
      body: 'Use Text for the current value, PlaceholderText for a hint, and AccessibleLabel for the field name. onTextChanged runs for user edits after Text has synchronized. Assigning Text changes the value; use onPropertyChanged when you also need to observe programmatic writes.',
      code: [
        "import { createTextInput } from 'framekit';",
        '',
        'const email = createTextInput({',
        "  InputType: 'Email', AccessibleLabel: 'Email address',",
        "  PlaceholderText: 'you@example.com',",
        '});',
        'email.onTextChanged((text) => {',
        '  console.log(text);',
        '});',
      ],
      note: 'InputType accepts Text, Email, Password, Search, Telephone, or URL. Do not use a placeholder as the only label. Parent the control under a mounted root to display it.',
    },
    {
      title: 'Activation & local events',
      body: 'onClick covers native button activation, including Enter and Space. Use on for typed DOM events on one control. Every native subscription belongs to the instance and also returns a function for early removal.',
      code: [
        "import { createTextButton } from 'framekit';",
        '',
        "const save = createTextButton({ Text: 'Save', AccessibleLabel: 'Save profile' });",
        "const stop = save.onClick(() => console.log('Save requested'));",
        "save.on('focus', () => console.log('Save has keyboard focus'));",
        'stop(); // Stop this subscription before destruction.',
      ],
      note: 'A local keydown handler receives keys while the control or a descendant has keyboard focus, usually via Tab or a click. Hover alone does not receive keyboard input. Use local handlers for control behavior, such as arrow navigation; use the input service for application shortcuts.',
    },
    {
      title: 'Keyboard input across the app',
      body: 'createUserInputService(owner) listens across the owner’s document, independently of which button has focus. Reuse one service per application. inputBegan and inputEnded expose the native KeyboardEvent plus a processed boolean; subscribe returns an early unsubscribe function.',
      code: [
        "import { createScreenGui, createUserInputService } from 'framekit';",
        '',
        'const app = createScreenGui();',
        'const input = createUserInputService(app);',
        'input.inputBegan.subscribe((event, processed) => {',
        '  if (processed || event.altKey || event.shiftKey) return;',
        "  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {",
        '    event.preventDefault();',
        "    console.log('Save requested');",
        '  }',
        '});',
        "app.mount('#app');",
      ],
      note: 'Processed means preventDefault was called before the document listener, or the target is an input, textarea, select, or editable element. Composition and repeated keydown events are ignored. isKeyDown("KeyW") reads physical KeyboardEvent.code state, including processed input; blur and hidden documents clear it. dispose(), or destroying the owner, releases all listeners. Detaching or unmounting keeps the service alive.',
    },
    {
      title: 'Links & secondary documents',
      body: 'Use Href for navigation, Target for the browsing context, and Rel for relationship tokens. DOM factories accept ownerDocument as their second argument; create the entire mounted tree in the same document.',
      code: [
        "import { createLink } from 'framekit';",
        '',
        'const source = createLink({',
        "  Text: 'Source', Href: 'https://github.com',",
        "  Target: '_blank', Rel: 'noopener noreferrer',",
        '}, { ownerDocument: document });',
      ],
      note: 'unsafeElement exposes the native element when needed for ARIA or a browser API. Direct DOM edits do not synchronize FrameKit properties.',
    },
  ],
} as const satisfies ReferenceChapter;
