/**
 * Parametric 6-band equalizer for clip audio (video-embedded or standalone).
 * Band layout mirrors common pro-NLE EQs: HP / low shelf / two peaking bands
 * / high shelf / LP. Curve math follows the RBJ Audio EQ Cookbook biquad
 * formulas so the on-screen curve matches what the FFmpeg export filters
 * (`highpass` / `bass` / `equalizer` / `treble` / `lowpass`) actually do.
 */

export type EqBandType = 'highpass' | 'lowshelf' | 'peaking' | 'highshelf' | 'lowpass';

export interface EqBand {
  id: string;
  type: EqBandType;
  /** Center / corner frequency in Hz. */
  freq: number;
  /** Gain in dB (ignored for highpass/lowpass). */
  gainDb: number;
  /** Q / resonance. */
  q: number;
  enabled: boolean;
}

export interface ClipEq {
  enabled: boolean;
  preset: string;
  bands: EqBand[];
}

export const EQ_MIN_FREQ = 20;
export const EQ_MAX_FREQ = 20000;
export const EQ_MIN_DB = -24;
export const EQ_MAX_DB = 24;
export const EQ_CURVE_SAMPLE_RATE = 48000;

export const EQ_BAND_TYPE_LABELS: Record<EqBandType, string> = {
  highpass: 'High Pass',
  lowshelf: 'Low Shelf',
  peaking: 'Peaking',
  highshelf: 'High Shelf',
  lowpass: 'Low Pass',
};

/** Fixed 6-band starting layout; bands 1 and 6 (HP/LP) start disabled. */
export function defaultEqBands(): EqBand[] {
  return [
    { id: 'band1', type: 'highpass', freq: 30, gainDb: 0, q: 0.71, enabled: false },
    { id: 'band2', type: 'lowshelf', freq: 120, gainDb: 0, q: 0.71, enabled: true },
    { id: 'band3', type: 'peaking', freq: 400, gainDb: 0, q: 1.1, enabled: true },
    { id: 'band4', type: 'peaking', freq: 1600, gainDb: 0, q: 1.1, enabled: true },
    { id: 'band5', type: 'highshelf', freq: 2800, gainDb: 0, q: 0.71, enabled: true },
    { id: 'band6', type: 'lowpass', freq: 22000, gainDb: 0, q: 0.71, enabled: false },
  ];
}

export function defaultClipEq(): ClipEq {
  return { enabled: false, preset: 'flat', bands: defaultEqBands() };
}

export function ensureClipEq(eq: ClipEq | undefined): ClipEq {
  if (!eq || !Array.isArray(eq.bands) || eq.bands.length === 0) return defaultClipEq();
  return eq;
}

interface EqPreset {
  id: string;
  label: string;
  /** Partial per-band overrides keyed by band id; unspecified bands keep defaults. */
  gains: Partial<Record<string, number>>;
}

export const EQ_PRESETS: EqPreset[] = [
  { id: 'flat', label: 'Flat', gains: {} },
  {
    id: 'vocalBoost',
    label: 'Vocal boost',
    gains: { band3: 2.5, band4: 3.5, band5: 1.5 },
  },
  { id: 'warm', label: 'Warm', gains: { band2: 3, band4: -1.5, band5: -2 } },
  { id: 'bright', label: 'Bright', gains: { band4: 2, band5: 4 } },
  { id: 'deMud', label: 'De-mud', gains: { band3: -3.5, band2: -1.5 } },
] as const;

export function applyEqPreset(presetId: string): ClipEq {
  const preset = EQ_PRESETS.find((p) => p.id === presetId) ?? EQ_PRESETS[0];
  const bands = defaultEqBands().map((band) => ({
    ...band,
    gainDb: preset.gains[band.id] ?? 0,
  }));
  return { enabled: presetId !== 'flat' ? true : false, preset: preset.id, bands };
}

export const GAIN_DB_MIN = -60;
export const GAIN_DB_MAX = 6;

/** Convert linear clip volume (0-2, 1 = unity) to a dB readout, floored at GAIN_DB_MIN. */
export function gainDbFromVolume(volume: number): number {
  const v = Math.max(0, volume);
  if (v <= 0.0001) return GAIN_DB_MIN;
  return Math.max(GAIN_DB_MIN, Math.min(GAIN_DB_MAX, 20 * Math.log10(v)));
}

/** Convert a dB gain readout back to linear clip volume (0-2). */
export function volumeFromGainDb(db: number): number {
  if (db <= GAIN_DB_MIN) return 0;
  return Math.min(2, Math.max(0, 10 ** (db / 20)));
}

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
}

/** RBJ Audio EQ Cookbook biquad coefficients for a single band. */
function biquadCoefficients(band: EqBand, sampleRate: number): Biquad {
  const freq = Math.min(sampleRate / 2 - 1, Math.max(1, band.freq));
  const q = Math.max(0.01, band.q);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * q);

  switch (band.type) {
    case 'highpass': {
      const b0 = (1 + cosw0) / 2;
      const b1 = -(1 + cosw0);
      const b2 = (1 + cosw0) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cosw0;
      const a2 = 1 - alpha;
      return { b0, b1, b2, a0, a1, a2 };
    }
    case 'lowpass': {
      const b0 = (1 - cosw0) / 2;
      const b1 = 1 - cosw0;
      const b2 = (1 - cosw0) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cosw0;
      const a2 = 1 - alpha;
      return { b0, b1, b2, a0, a1, a2 };
    }
    case 'lowshelf': {
      const A = 10 ** (band.gainDb / 40);
      const sqrtA = Math.sqrt(A);
      const b0 = A * (A + 1 - (A - 1) * cosw0 + 2 * sqrtA * alpha);
      const b1 = 2 * A * (A - 1 - (A + 1) * cosw0);
      const b2 = A * (A + 1 - (A - 1) * cosw0 - 2 * sqrtA * alpha);
      const a0 = A + 1 + (A - 1) * cosw0 + 2 * sqrtA * alpha;
      const a1 = -2 * (A - 1 + (A + 1) * cosw0);
      const a2 = A + 1 + (A - 1) * cosw0 - 2 * sqrtA * alpha;
      return { b0, b1, b2, a0, a1, a2 };
    }
    case 'highshelf': {
      const A = 10 ** (band.gainDb / 40);
      const sqrtA = Math.sqrt(A);
      const b0 = A * (A + 1 + (A - 1) * cosw0 + 2 * sqrtA * alpha);
      const b1 = -2 * A * (A - 1 + (A + 1) * cosw0);
      const b2 = A * (A + 1 + (A - 1) * cosw0 - 2 * sqrtA * alpha);
      const a0 = A + 1 - (A - 1) * cosw0 + 2 * sqrtA * alpha;
      const a1 = 2 * (A - 1 - (A + 1) * cosw0);
      const a2 = A + 1 - (A - 1) * cosw0 - 2 * sqrtA * alpha;
      return { b0, b1, b2, a0, a1, a2 };
    }
    case 'peaking':
    default: {
      const A = 10 ** (band.gainDb / 40);
      const b0 = 1 + alpha * A;
      const b1 = -2 * cosw0;
      const b2 = 1 - alpha * A;
      const a0 = 1 + alpha / A;
      const a1 = -2 * cosw0;
      const a2 = 1 - alpha / A;
      return { b0, b1, b2, a0, a1, a2 };
    }
  }
}

/** Magnitude response in dB of a single band at `freqHz`. */
function bandResponseDb(band: EqBand, freqHz: number, sampleRate: number): number {
  const { b0, b1, b2, a0, a1, a2 } = biquadCoefficients(band, sampleRate);
  const w = (2 * Math.PI * freqHz) / sampleRate;
  const cos1 = Math.cos(w);
  const sin1 = Math.sin(w);
  const cos2 = Math.cos(2 * w);
  const sin2 = Math.sin(2 * w);

  const numRe = b0 + b1 * cos1 + b2 * cos2;
  const numIm = -(b1 * sin1 + b2 * sin2);
  const denRe = a0 + a1 * cos1 + a2 * cos2;
  const denIm = -(a1 * sin1 + a2 * sin2);

  const numMag = Math.sqrt(numRe * numRe + numIm * numIm);
  const denMag = Math.sqrt(denRe * denRe + denIm * denIm);
  if (denMag <= 1e-12) return 0;
  return 20 * Math.log10(numMag / denMag);
}

/** Summed magnitude response (dB) of all enabled bands at `freqHz`. */
export function computeEqResponseDb(
  bands: EqBand[],
  freqHz: number,
  sampleRate = EQ_CURVE_SAMPLE_RATE,
): number {
  return bands.reduce((total, band) => {
    if (!band.enabled) return total;
    return total + bandResponseDb(band, freqHz, sampleRate);
  }, 0);
}

/** Log-scale x position (0-1) for a frequency between EQ_MIN_FREQ..EQ_MAX_FREQ. */
export function freqToX(freqHz: number): number {
  const clamped = Math.min(EQ_MAX_FREQ, Math.max(EQ_MIN_FREQ, freqHz));
  return (
    Math.log10(clamped / EQ_MIN_FREQ) / Math.log10(EQ_MAX_FREQ / EQ_MIN_FREQ)
  );
}

/** Inverse of `freqToX` — maps a 0-1 x position back to Hz. */
export function xToFreq(x: number): number {
  const clamped = Math.min(1, Math.max(0, x));
  return EQ_MIN_FREQ * (EQ_MAX_FREQ / EQ_MIN_FREQ) ** clamped;
}

/** y position (0-1, 0 = top/+max dB) for a gain value between EQ_MIN_DB..EQ_MAX_DB. */
export function dbToY(db: number): number {
  const clamped = Math.min(EQ_MAX_DB, Math.max(EQ_MIN_DB, db));
  return 1 - (clamped - EQ_MIN_DB) / (EQ_MAX_DB - EQ_MIN_DB);
}

/** Inverse of `dbToY`. */
export function yToDb(y: number): number {
  const clamped = Math.min(1, Math.max(0, y));
  return EQ_MAX_DB - clamped * (EQ_MAX_DB - EQ_MIN_DB);
}
