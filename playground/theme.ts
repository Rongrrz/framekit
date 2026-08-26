import { fk } from 'framekit';

export const colors = {
  ink: fk.color3(13, 16, 27),
  inkRaised: fk.color3(24, 29, 45),
  inkSoft: fk.color3(36, 42, 62),
  paper: fk.color3(244, 240, 231),
  paperRaised: fk.color3(255, 252, 245),
  paperMuted: fk.color3(222, 216, 204),
  text: fk.color3(247, 243, 235),
  textMuted: fk.color3(166, 173, 192),
  darkText: fk.color3(28, 30, 39),
  darkMuted: fk.color3(103, 101, 111),
  coral: fk.color3(255, 111, 95),
  mint: fk.color3(115, 215, 177),
  violet: fk.color3(174, 145, 255),
  amber: fk.color3(247, 197, 92),
  white: fk.color3(255, 255, 255),
} as const;

export const fonts = {
  sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;
