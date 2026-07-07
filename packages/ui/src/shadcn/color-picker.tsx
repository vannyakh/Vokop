"use client"

import * as React from "react"
import { useEffect, useRef, useState, type ComponentProps } from "react"
import { PipetteIcon, XIcon } from "lucide-react"

import { Button } from "./button.js"
import { Input } from "./input.js"
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select.js"
import { cn } from "../lib/utils.js"
import {
  appendAlpha,
  extractColorFromText,
  formatColorValue,
  hexToHsv,
  hsvToHex,
  parseColorInput,
  parseHexAlpha,
  type ColorFormat,
} from "../lib/color.js"

/**
 * OpenCut-style color picker: swatch + hex input trigger, popover with
 * saturation square, hue/opacity sliders, eyedropper, and hex/rgb/hsl/hsv
 * text entry. Values are hex strings WITHOUT `#` (8 chars when alpha < 1).
 */

const CHECKERBOARD_STYLE = {
  backgroundImage: `
    linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.1) 75%)
  `,
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
  backgroundColor: "#fff",
} as const

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>
}

function getEyeDropper(): EyeDropperConstructor | undefined {
  if (typeof window === "undefined") return undefined
  return (window as { EyeDropper?: EyeDropperConstructor }).EyeDropper
}

interface ColorPickerContentProps {
  value?: string
  onChange?: (value: string) => void
  onChangeEnd?: (value: string) => void
  onRequestClose?: () => void
  side?: ComponentProps<typeof PopoverContent>["side"]
  align?: ComponentProps<typeof PopoverContent>["align"]
}

function ColorPickerContent({
  value = "FFFFFF",
  onChange,
  onChangeEnd,
  onRequestClose,
  side = "left",
  align = "center",
}: ColorPickerContentProps) {
  const [isDragging, setIsDragging] = useState<
    "saturation" | "hue" | "opacity" | null
  >(null)
  const [internalHue, setInternalHue] = useState(0)
  const [inputValue, setInputValue] = useState(value)
  const [colorFormat, setColorFormat] = useState<ColorFormat>("hex")

  const saturationRef = useRef<HTMLButtonElement>(null)
  const hueRef = useRef<HTMLButtonElement>(null)
  const opacityRef = useRef<HTMLButtonElement>(null)
  const latestDragColorRef = useRef<string | null>(null)

  const isEyeDropperSupported = getEyeDropper() !== undefined

  const { rgb: rgbValue, alpha } = parseHexAlpha(value)
  const [h, s, v] = hexToHsv(rgbValue)

  // Keep the hue slider stable while dragging through greys (s = 0).
  const hueDiff = Math.abs(h - internalHue)
  const isSameHueWrapped = hueDiff < 1 || Math.abs(hueDiff - 360) < 1
  const displayHue = s === 0 || isSameHueWrapped ? internalHue : h

  useEffect(() => {
    setInputValue(formatColorValue(value, colorFormat))
  }, [value, colorFormat])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging === "saturation" && saturationRef.current) {
        const rect = saturationRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
        const newHex = appendAlpha(hsvToHex(displayHue, x, 1 - y), alpha)
        latestDragColorRef.current = newHex
        onChange?.(newHex)
      }

      if (isDragging === "hue" && hueRef.current) {
        const rect = hueRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        const newH = x * 360
        setInternalHue(newH)
        if (s > 0) {
          const newHex = appendAlpha(hsvToHex(newH, s, v), alpha)
          latestDragColorRef.current = newHex
          onChange?.(newHex)
        }
      }

      if (isDragging === "opacity" && opacityRef.current) {
        const rect = opacityRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        const newHex = appendAlpha(rgbValue, x)
        latestDragColorRef.current = newHex
        onChange?.(newHex)
      }
    }

    const handleMouseUp = () => {
      if (latestDragColorRef.current !== null && onChangeEnd) {
        onChangeEnd(latestDragColorRef.current)
        latestDragColorRef.current = null
      }
      setIsDragging(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, displayHue, s, v, alpha, rgbValue, onChange, onChangeEnd])

  const handleEyeDropper = async () => {
    const EyeDropper = getEyeDropper()
    if (!EyeDropper) return
    try {
      const dropper = new EyeDropper()
      const result = await dropper.open()
      const hex = result.sRGBHex.replace("#", "").toLowerCase()
      const finalHex = appendAlpha(hex, alpha)
      onChange?.(finalHex)
      onChangeEnd?.(finalHex)
    } catch {
      // user cancelled the picker
    }
  }

  const handleSaturationMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    const saturationElement = saturationRef.current
    if (!saturationElement) return
    setIsDragging("saturation")
    const rect = saturationElement.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    const newHex = appendAlpha(hsvToHex(displayHue, x, 1 - y), alpha)
    latestDragColorRef.current = newHex
    onChange?.(newHex)
  }

  const handleHueMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    const hueElement = hueRef.current
    if (!hueElement) return
    setIsDragging("hue")
    const rect = hueElement.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const newH = x * 360
    setInternalHue(newH)
    if (s > 0) {
      const newHex = appendAlpha(hsvToHex(newH, s, v), alpha)
      latestDragColorRef.current = newHex
      onChange?.(newHex)
    }
  }

  const handleOpacityMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    const opacityElement = opacityRef.current
    if (!opacityElement) return
    setIsDragging("opacity")
    const rect = opacityElement.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const newHex = appendAlpha(rgbValue, x)
    latestDragColorRef.current = newHex
    onChange?.(newHex)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(
      colorFormat === "hex"
        ? event.target.value.replace("#", "")
        : event.target.value
    )
  }

  const commitInputValue = () => {
    const parsed = parseColorInput(inputValue, colorFormat)
    if (parsed) {
      const nextHex = appendAlpha(parsed, alpha)
      onChange?.(nextHex)
      onChangeEnd?.(nextHex)
      return
    }

    const extracted = extractColorFromText(inputValue)
    if (extracted) {
      const hasExplicitAlpha = extracted.length > 6
      const finalHex = hasExplicitAlpha ? extracted : appendAlpha(extracted, alpha)
      onChange?.(finalHex)
      onChangeEnd?.(finalHex)
    }
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitInputValue()
      event.currentTarget.blur()
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData("text")
    const extractedHex = extractColorFromText(pastedText)
    if (!extractedHex) return

    event.preventDefault()
    const hasExplicitAlpha = extractedHex.length > 6
    const finalHex = hasExplicitAlpha
      ? extractedHex
      : appendAlpha(extractedHex, alpha)
    onChange?.(finalHex)
    onChangeEnd?.(finalHex)
  }

  const saturationStyle = {
    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${displayHue}, 100%, 50%))`,
  }

  const hueStyle = {
    background:
      "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
  }

  return (
    <PopoverContent
      className="flex w-64 select-none flex-col gap-3 px-0 py-2"
      side={side}
      align={align}
      sideOffset={8}
    >
      <header className="flex items-center justify-between border-b px-2 pb-2">
        <span className="text-sm font-medium">Color</span>
        <div className="flex items-center">
          {isEyeDropperSupported && (
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Pick color from screen"
              onClick={handleEyeDropper}
            >
              <PipetteIcon />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Close color picker"
            onClick={onRequestClose}
          >
            <XIcon />
          </Button>
        </div>
      </header>
      <div className="flex flex-col gap-3 px-2">
        <button
          ref={saturationRef}
          className="relative h-44 w-full appearance-none rounded-md border-0 bg-transparent p-0"
          style={saturationStyle}
          type="button"
          aria-label="Saturation and brightness"
          onMouseDown={handleSaturationMouseDown}
        >
          <ColorCircle
            size="sm"
            position={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
            color={`#${value}`}
          />
        </button>

        <button
          ref={hueRef}
          className="relative h-4 w-full appearance-none rounded-lg border-0 bg-transparent p-0"
          style={hueStyle}
          type="button"
          aria-label="Hue"
          onMouseDown={handleHueMouseDown}
        >
          <ColorCircle
            size="md"
            position={{
              left: `calc(0.5rem + (100% - 1rem) * ${displayHue / 360})`,
              top: "50%",
            }}
          />
        </button>

        <button
          ref={opacityRef}
          className="relative h-4 w-full appearance-none overflow-hidden rounded-lg border-0 p-0"
          type="button"
          aria-label="Opacity"
          onMouseDown={handleOpacityMouseDown}
        >
          <div className="absolute inset-0 dark:invert" style={CHECKERBOARD_STYLE} />
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: `linear-gradient(to right, transparent, #${rgbValue})`,
            }}
          />
          <ColorCircle
            size="md"
            position={{
              left: `calc(0.5rem + (100% - 1rem) * ${alpha})`,
              top: "50%",
            }}
          />
        </button>

        <div className="flex items-center gap-2">
          <Select
            value={colorFormat}
            onValueChange={(selectedFormat) =>
              setColorFormat(selectedFormat as ColorFormat)
            }
          >
            <SelectTrigger size="sm" className="min-w-18 max-w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hex">HEX</SelectItem>
              <SelectItem value="rgb">RGB</SelectItem>
              <SelectItem value="hsl">HSL</SelectItem>
              <SelectItem value="hsv">HSV</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className={cn(
              "h-7 rounded-sm p-2.5",
              colorFormat === "hex" && "uppercase"
            )}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={commitInputValue}
            onKeyDown={handleInputKeyDown}
            onPaste={handlePaste}
          />
        </div>
      </div>
    </PopoverContent>
  )
}

export interface ColorPickerProps {
  /** Hex without `#`, 6 or 8 chars (8 = with alpha). */
  value?: string
  onChange?: (value: string) => void
  onChangeEnd?: (value: string) => void
  className?: string
  contentSide?: ComponentProps<typeof PopoverContent>["side"]
  contentAlign?: ComponentProps<typeof PopoverContent>["align"]
}

function ColorPicker({
  className,
  value = "FFFFFF",
  onChange,
  onChangeEnd,
  contentSide,
  contentAlign,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const { alpha } = parseHexAlpha(value)

  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const commitInputValue = (raw: string) => {
    const input = raw.replace("#", "")
    const parsed = parseColorInput(input, "hex")
    if (parsed) {
      const nextHex = appendAlpha(parsed, alpha)
      onChange?.(nextHex)
      onChangeEnd?.(nextHex)
      return
    }
    const extracted = extractColorFromText(input)
    if (extracted) {
      const hasExplicitAlpha = extracted.length > 6
      const finalHex = hasExplicitAlpha ? extracted : appendAlpha(extracted, alpha)
      onChange?.(finalHex)
      onChangeEnd?.(finalHex)
    }
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitInputValue(inputValue)
      event.currentTarget.blur()
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData("text")
    const extractedHex = extractColorFromText(pastedText)
    if (!extractedHex) return
    event.preventDefault()
    const hasExplicitAlpha = extractedHex.length > 6
    const finalHex = hasExplicitAlpha
      ? extractedHex
      : appendAlpha(extractedHex, alpha)
    onChange?.(finalHex)
    onChangeEnd?.(finalHex)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        data-slot="color-picker"
        className={cn(
          "bg-accent flex h-7 flex-1 items-center gap-2 rounded-md border px-[0.45rem]",
          className
        )}
      >
        <PopoverTrigger
          aria-label="Open color picker"
          className="size-4.5 relative cursor-pointer overflow-hidden rounded-sm border hover:ring-1 hover:ring-foreground/20"
        >
          <span className="absolute inset-0 dark:invert" style={CHECKERBOARD_STYLE} />
          <span
            className="absolute inset-0"
            style={{ backgroundColor: `#${value}` }}
          />
        </PopoverTrigger>
        <div className="flex flex-1 items-center">
          <Input
            className="h-6 border-0! bg-transparent p-0 uppercase ring-0! focus-visible:ring-0!"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value.replace("#", ""))}
            onBlur={() => commitInputValue(inputValue)}
            onKeyDown={handleInputKeyDown}
            onPaste={handlePaste}
          />
        </div>
      </div>
      <ColorPickerContent
        value={value}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        onRequestClose={() => setOpen(false)}
        side={contentSide}
        align={contentAlign}
      />
    </Popover>
  )
}

const ColorCircle = ({
  size,
  position,
  color,
}: {
  size: "sm" | "md"
  position: { left: string; top: string }
  color?: string
}) => (
  <div
    className={cn(
      "pointer-events-none absolute rounded-full border-2 border-white shadow-lg",
      size === "sm" ? "size-3" : "size-4"
    )}
    style={{
      left: position.left,
      top: position.top,
      transform: "translate(-50%, -50%)",
      backgroundColor: color,
    }}
  />
)

export { ColorPicker, ColorPickerContent }
