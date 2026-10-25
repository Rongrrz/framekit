import type { ProjectFile } from './project-export';

/** Theme labels and worker messages stay lightweight in the main editor bundle. */
export const codeThemes = [
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'github-light', label: 'GitHub Light' },
] as const;

export type CodeTheme = (typeof codeThemes)[number]['id'];

/** All themes share the same source for rendering, editing, clipboard, and downloads. */
export type PreparedCode = Readonly<{
  source: string;
  palettes: Readonly<
    Record<
      CodeTheme,
      Readonly<{ text: string; foreground: string; background: string; muted: string }>
    >
  >;
}>;

export type CodeRequest = Readonly<{
  id: number;
  source: string;
  language?: ProjectFile['language'];
  /** Highlight preserves the editing buffer. Requests otherwise format before highlighting. */
  operation?: 'highlight' | 'format';
}>;
export type CodeResponse = Readonly<
  { id: number; result: PreparedCode } | { id: number; error: string }
>;
