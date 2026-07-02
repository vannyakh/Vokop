import type { VoiceOption } from '../types/preferences.js';
import { DEFAULT_VOICE } from '../config/defaults.js';

export const VOICES: VoiceOption[] = [
  { id: 'Kore', label: 'Female (Kore)' },
  { id: 'Zephyr', label: 'Female (Zephyr)' },
  { id: 'Puck', label: 'Male (Puck)' },
  { id: 'Charon', label: 'Male (Charon)' },
  { id: 'Fenrir', label: 'Male (Fenrir)' },
];

export { DEFAULT_VOICE };
