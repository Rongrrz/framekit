import { color3FromHex } from 'framekit';

/** These tokens belong only to editor chrome; authored scene colors are independent. */
export const colors = {
  canvas: color3FromHex('#111216'),
  panel: color3FromHex('#1b1c21'),
  raised: color3FromHex('#26282f'),
  field: color3FromHex('#15161b'),
  border: color3FromHex('#34363f'),
  text: color3FromHex('#eeedf2'),
  muted: color3FromHex('#a1a4b1'),
  faint: color3FromHex('#777b89'),
  accent: color3FromHex('#aff1d1'),
  selected: color3FromHex('#284438'),
  danger: color3FromHex('#f3a49d'),
};

export const lightColors: typeof colors = {
  canvas: color3FromHex('#f3f4f6'),
  panel: color3FromHex('#ffffff'),
  raised: color3FromHex('#e9edf1'),
  field: color3FromHex('#f8fafc'),
  border: color3FromHex('#d2d8e1'),
  text: color3FromHex('#1c2430'),
  muted: color3FromHex('#526071'),
  faint: color3FromHex('#637183'),
  accent: color3FromHex('#17684d'),
  selected: color3FromHex('#dbf2e7'),
  danger: color3FromHex('#aa3028'),
};
