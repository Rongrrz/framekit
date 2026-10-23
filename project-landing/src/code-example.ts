/** Prepared literal source and RichText palettes; formatting runs only during development/build. */
export type CodeExample = Readonly<{
  source: string;
  light: CodePalette;
  dark: CodePalette;
}>;

type CodePalette = Readonly<{
  text: string;
  foreground: string;
  background: string;
}>;
