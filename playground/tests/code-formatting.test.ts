import { describe, expect, it } from 'vitest';

import { prepareCode } from '../tooling/code-formatting';

describe('build-time code preparation', () => {
  it.each([
    ['index.html', '<div id="app"></div>\n<script>const count = 1;</script>'],
    ['install.sh', '# In your application\n\nnpm install framekit'],
    ['example.ts', '// A comment\nconst title = `Count: ${count + 1}`;'],
  ])('highlights %s as literal text with both palettes', async (filename, source) => {
    const example = await prepareCode(source, filename);
    const container = document.createElement('div');
    container.innerHTML = example.html;

    expect(container.querySelector('code')!.textContent).toBe(example.source);
    expect(container.querySelector('script')).toBeNull();
    expect(example.html).toContain('--shiki-dark:');
    expect(container.querySelectorAll('code span[style]').length).toBeGreaterThan(1);
  });

  it('preserves logical blank lines while formatting indentation and line endings', async () => {
    const example = await prepareCode(
      "import { createFrame } from 'framekit';\r\n\r\nconst card=createFrame({Name:'Profile',Visible:true});\r\ncard.Parent=app;\r\n",
      'profile.ts',
    );

    expect(example.source).toBe(
      "import { createFrame } from 'framekit';\n\nconst card = createFrame({ Name: 'Profile', Visible: true });\ncard.Parent = app;",
    );
  });
});
