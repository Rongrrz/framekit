import { prepareCode } from './code-format';
import type { CodeRequest, CodeResponse } from './code-themes';

self.addEventListener('message', async (event: MessageEvent<CodeRequest>) => {
  let response: CodeResponse;

  try {
    response = { id: event.data.id, result: await prepareCode(event.data.source) };
  } catch (error) {
    response = { id: event.data.id, error: error instanceof Error ? error.message : String(error) };
  }

  self.postMessage(response);
});
