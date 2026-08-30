import { fk } from 'framekit';

export const colors = {
  ink: fk.color3FromRGB(13, 16, 27),
  inkRaised: fk.color3FromRGB(24, 29, 45),
  inkSoft: fk.color3FromRGB(36, 42, 62),
  paper: fk.color3FromRGB(244, 240, 231),
  paperRaised: fk.color3FromRGB(255, 252, 245),
  paperMuted: fk.color3FromRGB(222, 216, 204),
  text: fk.color3FromRGB(247, 243, 235),
  textMuted: fk.color3FromRGB(166, 173, 192),
  darkText: fk.color3FromRGB(28, 30, 39),
  darkMuted: fk.color3FromRGB(103, 101, 111),
  coral: fk.color3FromRGB(255, 111, 95),
  mint: fk.color3FromRGB(115, 215, 177),
  violet: fk.color3FromRGB(174, 145, 255),
  amber: fk.color3FromRGB(247, 197, 92),
} as const;

export const fonts = {
  sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;
