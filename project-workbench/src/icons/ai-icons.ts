import arrow_down from './ai-arrow-down.svg?url';
import arrow_left from './ai-arrow-left.svg?url';
import arrow_up from './ai-arrow-up.svg?url';
import blank from './ai-blank.svg?url';
import button from './ai-button.svg?url';
import canvas from './ai-canvas.svg?url';
import check from './ai-check.svg?url';
import chevron_down from './ai-chevron-down.svg?url';
import chevron_right from './ai-chevron-right.svg?url';
import clock from './ai-clock.svg?url';
import close from './ai-close.svg?url';
import code from './ai-code.svg?url';
import collapse from './ai-collapse.svg?url';
import command from './ai-command.svg?url';
import copy from './ai-copy.svg?url';
import cursor from './ai-cursor.svg?url';
import cut from './ai-cut.svg?url';
import dashboard from './ai-dashboard.svg?url';
import download from './ai-download.svg?url';
import edit from './ai-edit.svg?url';
import events from './ai-events.svg?url';
import expand from './ai-expand.svg?url';
import eye_off from './ai-eye-off.svg?url';
import eye from './ai-eye.svg?url';
import file from './ai-file.svg?url';
import folder from './ai-folder.svg?url';
import frame from './ai-frame.svg?url';
import hand from './ai-hand.svg?url';
import image from './ai-image.svg?url';
import input from './ai-input.svg?url';
import layers from './ai-layers.svg?url';
import layout from './ai-layout.svg?url';
import list from './ai-list.svg?url';
import login from './ai-login.svg?url';
import modifier from './ai-modifier.svg?url';
import more from './ai-more.svg?url';
import paste from './ai-paste.svg?url';
import play from './ai-play.svg?url';
import plus from './ai-plus.svg?url';
import prefab from './ai-prefab.svg?url';
import redo from './ai-redo.svg?url';
import save from './ai-save.svg?url';
import search from './ai-search.svg?url';
import settings from './ai-settings.svg?url';
import text from './ai-text.svg?url';
import trash from './ai-trash.svg?url';
import undo from './ai-undo.svg?url';

/** Trusted local SVG assets shared by all workbench chrome. */
export const icons = {
  cursor,
  hand,
  plus,
  close,
  chevron_down,
  chevron_right,
  arrow_left,
  arrow_up,
  arrow_down,
  undo,
  redo,
  play,
  settings,
  search,
  save,
  download,
  more,
  check,
  layers,
  prefab,
  frame,
  canvas,
  folder,
  file,
  code,
  command,
  events,
  text,
  button,
  input,
  image,
  modifier,
  edit,
  trash,
  copy,
  cut,
  paste,
  eye,
  eye_off,
  expand,
  collapse,
  dashboard,
  list,
  login,
  layout,
  blank,
  clock,
} as const;

/** A workbench icon name, independent of theme or scene content. */
export type IconName = keyof typeof icons;
