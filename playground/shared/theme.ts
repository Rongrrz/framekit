import { fk } from 'framekit';

export const palette = {
  void: fk.color3(241, 235, 226),
  canvas: fk.color3(250, 247, 241),
  panel: fk.color3(255, 253, 249),
  raised: fk.color3(247, 241, 234),
  border: fk.color3(222, 211, 202),
  text: fk.color3(48, 42, 52),
  muted: fk.color3(125, 113, 124),
  coral: fk.color3(238, 113, 99),
  lilac: fk.color3(158, 126, 190),
  mint: fk.color3(81, 174, 145),
  amber: fk.color3(221, 151, 61),
  red: fk.color3(210, 82, 91),
} as const;
