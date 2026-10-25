import type { NodeType } from '../schema';
import type { IconName } from './ai-icons';

/** Object types have the same visual identity in insertion, search, and the hierarchy. */
export const nodeIcons = {
  Script: 'code',
  Frame: 'frame',
  ScrollingFrame: 'layout',
  TextLabel: 'text',
  TextButton: 'button',
  TextInput: 'input',
  ImageLabel: 'image',
  UICorner: 'modifier',
  UIStroke: 'modifier',
  UIListLayout: 'list',
  UIPadding: 'modifier',
  UIShadow: 'modifier',
} satisfies Record<NodeType, IconName>;
