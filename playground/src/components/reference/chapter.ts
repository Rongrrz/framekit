import type { CodeExample } from '../../code-example';

/** Concise chapters keep API contracts and the example that demonstrates them together. */
export type ReferenceChapter = Readonly<{
  title: string;
  summary: string;
  sections: readonly Readonly<{
    title: string;
    body: string;
    code?: CodeExample;
    note?: string;
  }>[];
}>;
