import { createFrame, spring } from 'framekit';

const card = createFrame();

spring(card, { Rotation: 24 });

card.Rotation = card.Rotation; // Stop Rotation at its current value.

card.destroy(); // Cancel animation and release its registrations.
