/**
 * Internal color helpers for @vokop/ui components (ColorPicker).
 * Mirrors `@vokop/shared` `utils/color.ts` — kept local so the UI package
 * stays free of workspace dependencies. Hex values are handled WITHOUT a
 * leading `#` (6 or 8 chars).
 */

export type ColorFormat = "hex" | "rgb" | "hsl" | "hsv"

interface RgbColor {
  /** 0–1 */
  r: number
  /** 0–1 */
  g: number
  /** 0–1 */
  b: number
  /** 0–1 */
  alpha?: number
}

function componentToHex(value: number): string {
  return Math.round(Math.max(0, Math.min(1, value)) * 255)
    .toString(16)
    .padStart(2, "0")
}

function rgbToHexString(color: RgbColor): string {
  return componentToHex(color.r) + componentToHex(color.g) + componentToHex(color.b)
}

function hexToRgb(hex: string): RgbColor | null {
  const cleaned = hex.replace("#", "").trim()
  if (!/^[0-9a-fA-F]{3,8}$/.test(cleaned)) return null

  let expanded = cleaned
  if (cleaned.length === 3 || cleaned.length === 4) {
    expanded = cleaned
      .split("")
      .map((c) => c + c)
      .join("")
  }
  if (expanded.length !== 6 && expanded.length !== 8) return null

  const r = parseInt(expanded.slice(0, 2), 16) / 255
  const g = parseInt(expanded.slice(2, 4), 16) / 255
  const b = parseInt(expanded.slice(4, 6), 16) / 255
  const alpha =
    expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : undefined
  return { r, g, b, alpha }
}

/** h in 0–360, s/v in 0–1. */
function rgbToHsv(color: RgbColor): [number, number, number] {
  const { r, g, b } = color
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }
  if (h < 0) h += 360

  const s = max === 0 ? 0 : delta / max
  return [h, s, max]
}

function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hue = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = v - c

  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) [r, g, b] = [c, x, 0]
  else if (hue < 120) [r, g, b] = [x, c, 0]
  else if (hue < 180) [r, g, b] = [0, c, x]
  else if (hue < 240) [r, g, b] = [0, x, c]
  else if (hue < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return { r: r + m, g: g + m, b: b + m }
}

/** h in 0–360, s/l in 0–1. */
function rgbToHsl(color: RgbColor): [number, number, number] {
  const [h] = rgbToHsv(color)
  const { r, g, b } = color
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  const v = l + s * Math.min(l, 1 - l)
  const sv = v === 0 ? 0 : 2 * (1 - l / v)
  return hsvToRgb(h, sv, v)
}

/** Hex (no `#`) → [h 0–360, s 0–1, v 0–1]. */
export function hexToHsv(hex: string): [number, number, number] {
  const color = hexToRgb(hex)
  if (!color) return [0, 0, 0]
  return rgbToHsv(color)
}

/** HSV → 6-char hex (no `#`). */
export function hsvToHex(h: number, s: number, v: number): string {
  return rgbToHexString(hsvToRgb(h, s, v))
}

/** Split a hex value into its opaque RGB part and alpha channel. */
export function parseHexAlpha(hex: string): { rgb: string; alpha: number } {
  const color = hexToRgb(hex)
  if (!color) {
    return { rgb: hex.slice(0, 6).toLowerCase(), alpha: 1 }
  }
  return { rgb: rgbToHexString(color), alpha: color.alpha ?? 1 }
}

/** Append an alpha channel to a 6-char hex when alpha < 1. */
export function appendAlpha(rgbHex: string, alpha: number): string {
  if (alpha >= 1) return rgbHex
  return rgbHex + componentToHex(alpha)
}

function stripCssNoise(text: string): string {
  let cleaned = text.trim()
  cleaned = cleaned
    .replace(/\s*!important\s*/gi, "")
    .replace(/;+\s*$/, "")
    .trim()

  const colonIndex = cleaned.indexOf(":")
  const parenIndex = cleaned.indexOf("(")
  if (colonIndex !== -1 && (parenIndex === -1 || colonIndex < parenIndex)) {
    cleaned = cleaned.slice(colonIndex + 1).trim()
  }

  return cleaned
}

function rgbToHexWithAlpha(color: RgbColor): string {
  const hex = rgbToHexString(color)
  if (color.alpha !== undefined && color.alpha < 1) {
    return hex + componentToHex(color.alpha)
  }
  return hex
}

function parseCssFunctionColor(input: string): RgbColor | null {
  const match = input.match(/^(rgba?|hsla?)\(([^)]+)\)$/i)
  if (!match) return null

  const fn = match[1].toLowerCase()
  const parts = match[2]
    .split(/[\s,/]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 3) return null

  const parseChannel = (raw: string, scale: number): number | null => {
    const isPercent = raw.endsWith("%")
    const value = parseFloat(raw)
    if (Number.isNaN(value)) return null
    return isPercent ? value / 100 : value / scale
  }

  const alphaRaw = parts[3]
  let alpha: number | undefined
  if (alphaRaw !== undefined) {
    const parsed = parseChannel(alphaRaw, 1)
    if (parsed === null) return null
    alpha = Math.max(0, Math.min(1, parsed))
  }

  if (fn.startsWith("rgb")) {
    const r = parseChannel(parts[0], 255)
    const g = parseChannel(parts[1], 255)
    const b = parseChannel(parts[2], 255)
    if (r === null || g === null || b === null) return null
    return {
      r: Math.max(0, Math.min(1, r)),
      g: Math.max(0, Math.min(1, g)),
      b: Math.max(0, Math.min(1, b)),
      alpha,
    }
  }

  const h = parseFloat(parts[0])
  const s = parseChannel(parts[1], 1)
  const l = parseChannel(parts[2], 1)
  if (Number.isNaN(h) || s === null || l === null) return null
  return {
    ...hslToRgb(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l))),
    alpha,
  }
}

/**
 * Extract a hex color (no `#`, alpha appended when < 1) from pasted text.
 * Supports `#hex`, bare hex, `rgb()/rgba()`, `hsl()/hsla()`, and CSS
 * declarations like `color: #ff0000;`. Named colors are not supported.
 */
export function extractColorFromText(text: string): string | null {
  const cleaned = stripCssNoise(text)

  if (cleaned.startsWith("#")) {
    const color = hexToRgb(cleaned)
    if (color) return rgbToHexWithAlpha(color)
  }

  const fnColor = parseCssFunctionColor(cleaned)
  if (fnColor) return rgbToHexWithAlpha(fnColor)

  const bareHexMatch = cleaned.match(/^([0-9a-fA-F]{3,8})$/)
  if (bareHexMatch) {
    const color = hexToRgb(bareHexMatch[1])
    if (color) return rgbToHexWithAlpha(color)
  }

  const embeddedHexMatch = text.match(/#([0-9a-fA-F]{3,8})\b/)
  if (embeddedHexMatch) {
    const color = hexToRgb(embeddedHexMatch[1])
    if (color) return rgbToHexWithAlpha(color)
  }

  return null
}

/** Format an opaque hex value for display in the given color format. */
export function formatColorValue(hex: string, format: ColorFormat): string {
  switch (format) {
    case "hex":
      return hex
    case "rgb": {
      const color = hexToRgb(hex)
      if (!color) return hex
      return `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`
    }
    case "hsl": {
      const color = hexToRgb(hex)
      if (!color) return hex
      const [h, s, l] = rgbToHsl(color)
      return `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`
    }
    case "hsv": {
      const [h, s, v] = hexToHsv(hex)
      return `${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(v * 100)}%`
    }
  }
}

/** Parse a user-typed value in the given format back to hex (no `#`). */
export function parseColorInput(input: string, format: ColorFormat): string | null {
  switch (format) {
    case "hex": {
      const cleaned = input.replace("#", "")
      return /^[0-9a-fA-F]{3,8}$/.test(cleaned) ? cleaned : null
    }
    case "rgb": {
      const parts = input.split(",").map((part) => parseInt(part.trim(), 10))
      if (parts.length < 3 || parts.some(Number.isNaN)) return null
      return rgbToHexString({
        r: parts[0] / 255,
        g: parts[1] / 255,
        b: parts[2] / 255,
      })
    }
    case "hsl": {
      const parts = input.split(",").map((part) => parseFloat(part.trim()))
      if (parts.length < 3 || parts.some(Number.isNaN)) return null
      return rgbToHexString(hslToRgb(parts[0], parts[1] / 100, parts[2] / 100))
    }
    case "hsv": {
      const parts = input.split(",").map((part) => parseFloat(part.trim()))
      if (parts.length < 3 || parts.some(Number.isNaN)) return null
      return rgbToHexString(hsvToRgb(parts[0], parts[1] / 100, parts[2] / 100))
    }
  }
}
