import { highlightCode, prepareCode } from './code-format';
import type { CodeRequest, CodeResponse } from './code-themes';

self.addEventListener('message', async (event: MessageEvent<CodeRequest>) => {
  let response: CodeResponse;

  try {
    response = {
      id: event.data.id,
      result:
        event.data.operation === 'highlight'
          ? highlightCode(event.data.source, event.data.language)
          : await prepareCode(event.data.source, event.data.language),
    };
  } catch (error) {
    response = { id: event.data.id, error: error instanceof Error ? error.message : String(error) };
  }

  self.postMessage(response);
});
