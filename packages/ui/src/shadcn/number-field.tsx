"use client"

import * as React from "react"
import { useLayoutEffect, useRef, useState } from "react"
import { Undo2Icon } from "lucide-react"

import { Button } from "./button.js"
import { useFocusLock } from "../hooks/use-focus-lock.js"
import { cn } from "../lib/utils.js"

/**
 * Numeric input with drag-to-scrub icon, optional unit suffix, and reset
 * button (OpenCut-style inspector field). Pair with
 * `evaluateMathExpression` from `@vokop/shared` to accept typed expressions.
 */

const SUFFIX_GAP_PX = 6

const DRAG_SENSITIVITIES = {
  default: 1,
  slow: 0.5,
} as const

type DragSensitivity = keyof typeof DRAG_SENSITIVITIES

export interface NumberFieldScrubRange {
  from: number
  to: number
  pixelsPerUnit: number
}

export interface NumberFieldScrubClamp {
  min?: number
  max?: number
}

function clampScrubValue(value: number, min?: number, max?: number): number {
  if (min != null && max != null) return Math.max(min, Math.min(max, value))
  if (min != null) return Math.max(min, value)
  if (max != null) return Math.min(max, value)
  return value
}

function getActiveRange(
  value: number,
  direction: number,
  ranges: readonly NumberFieldScrubRange[]
): NumberFieldScrubRange | undefined {
  return ranges.find((range) =>
    direction > 0
      ? value >= range.from && value < range.to
      : value > range.from && value <= range.to
  )
}

/** Walk pixel deltas across ranges with different per-unit sensitivities. */
function scrubAcrossRanges({
  startValue,
  pixelDelta,
  ranges,
  min,
  max,
}: {
  startValue: number
  pixelDelta: number
  ranges: readonly NumberFieldScrubRange[]
  min?: number
  max?: number
}): number {
  let currentValue = clampScrubValue(startValue, min, max)
  let remainingPixels = pixelDelta

  while (remainingPixels !== 0) {
    const direction = Math.sign(remainingPixels)

    const range = getActiveRange(currentValue, direction, ranges)
    if (!range) break

    const boundary = direction > 0 ? range.to : range.from
    const pixelsToBoundary =
      Math.abs(boundary - currentValue) * range.pixelsPerUnit

    if (Math.abs(remainingPixels) <= pixelsToBoundary) {
      currentValue += remainingPixels / range.pixelsPerUnit
      break
    }

    currentValue = boundary
    remainingPixels -= direction * pixelsToBoundary
  }

  return clampScrubValue(currentValue, min, max)
}

export interface NumberFieldProps
  extends Omit<React.ComponentProps<"input">, "size" | "type"> {
  icon?: React.ReactNode
  suffix?: string
  suffixClassName?: string
  dragSensitivity?: DragSensitivity
  scrubRanges?: readonly NumberFieldScrubRange[]
  scrubClamp?: NumberFieldScrubClamp
  onScrub?: (value: number) => void
  onScrubEnd?: () => void
  /** Text input mode so consumers can parse typed math expressions. */
  allowExpressions?: boolean
  onReset?: () => void
  isDefault?: boolean
}

function NumberField({
  className,
  icon,
  suffix,
  suffixClassName,
  disabled,
  dragSensitivity = "default",
  scrubRanges,
  scrubClamp,
  onScrub,
  onScrubEnd,
  value,
  allowExpressions = true,
  onKeyDown,
  onFocus,
  onBlur,
  onMouseDown,
  onReset,
  isDefault = false,
  ref,
  ...props
}: NumberFieldProps) {
  const iconRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ghostRef = useRef<HTMLSpanElement>(null)
  const startValueRef = useRef(0)
  const cumulativeDeltaRef = useRef(0)
  const [suffixLeft, setSuffixLeft] = useState(0)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const ghostValue = Array.isArray(value)
    ? value.join(", ")
    : String(value ?? "")

  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

  useLayoutEffect(() => {
    if (!suffix) {
      setSuffixLeft(0)
      return
    }
    if (!ghostRef.current || !inputRef.current) return
    if (ghostRef.current.textContent !== ghostValue) {
      ghostRef.current.textContent = ghostValue
    }
    const paddingLeft =
      parseFloat(getComputedStyle(inputRef.current).paddingLeft) || 0
    setSuffixLeft(paddingLeft + ghostRef.current.offsetWidth)
  }, [ghostValue, suffix])

  const handleIconPointerDown = (event: React.PointerEvent) => {
    if (!onScrub || disabled || event.button !== 0) return
    const parsed = parseFloat(String(value ?? "0"))
    startValueRef.current = Number.isNaN(parsed) ? 0 : parsed
    cumulativeDeltaRef.current = 0
    let hasReceivedFirstMove = false
    iconRef.current?.requestPointerLock()

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // First movementX after pointer lock often contains a bogus warp delta.
      if (!hasReceivedFirstMove) {
        hasReceivedFirstMove = true
        return
      }
      cumulativeDeltaRef.current += moveEvent.movementX
      const newValue = scrubRanges
        ? scrubAcrossRanges({
            startValue: startValueRef.current,
            pixelDelta: cumulativeDeltaRef.current,
            ranges: scrubRanges,
            min: scrubClamp?.min,
            max: scrubClamp?.max,
          })
        : startValueRef.current +
          cumulativeDeltaRef.current * DRAG_SENSITIVITIES[dragSensitivity]
      onScrub(newValue)
    }

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.exitPointerLock()
      onScrubEnd?.()
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  // While editing, lock pointer events outside the field so a stray hover or
  // click elsewhere can't disturb the in-progress edit (blur commits instead).
  const { containerRef: wrapperRef } = useFocusLock<HTMLDivElement>({
    isActive: isInputFocused,
    onDismiss: () => inputRef.current?.blur(),
    cursor: "text",
  })

  const canScrub = Boolean(icon && onScrub)

  return (
    <div
      ref={wrapperRef}
      data-slot="number-field"
      className={cn(
        "border-border bg-accent focus-within:border-primary flex h-7 w-full min-w-0 cursor-text items-center rounded-md border text-sm outline-none",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className
      )}
    >
      {icon &&
        (canScrub ? (
          <button
            ref={iconRef}
            type="button"
            aria-label="Drag to adjust value"
            disabled={disabled}
            className="text-muted-foreground shrink-0 cursor-ew-resize select-none pl-2.5 text-sm leading-none [&_svg]:size-3.5!"
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={handleIconPointerDown}
          >
            {icon}
          </button>
        ) : (
          <span className="text-muted-foreground shrink-0 select-none pl-2.5 text-sm leading-none [&_svg]:size-3.5!">
            {icon}
          </span>
        ))}
      <span
        className={cn(
          "relative flex min-w-0 flex-1 items-center",
          icon ? "px-1.5" : "pl-2.5",
          onReset ? "pr-0" : "pr-2.5"
        )}
      >
        <input
          type={allowExpressions ? "text" : "number"}
          inputMode={allowExpressions ? "decimal" : undefined}
          ref={inputRef}
          disabled={disabled}
          value={value}
          className="min-w-0 flex-1 bg-transparent text-sm leading-none outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onMouseDown={(event) => {
            const inputElement = event.currentTarget
            const shouldPreventNativeCaretPlacement =
              event.button === 0 && document.activeElement !== inputElement
            if (shouldPreventNativeCaretPlacement) {
              event.preventDefault()
              inputElement.focus()
              inputElement.select()
            }
            onMouseDown?.(event)
          }}
          onFocus={(event) => {
            event.currentTarget.select()
            setIsInputFocused(true)
            onFocus?.(event)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur()
            }
            onKeyDown?.(event)
          }}
          onBlur={(event) => {
            setIsInputFocused(false)
            onBlur?.(event)
          }}
          {...props}
        />
        {suffix && (
          <>
            {/* Ghost mirrors value text to measure width for suffix positioning */}
            <span
              ref={ghostRef}
              className="pointer-events-none invisible absolute whitespace-pre text-sm leading-none"
              aria-hidden="true"
            >
              {ghostValue}
            </span>
            <span
              className={cn(
                "text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2 select-none text-sm leading-none",
                suffixClassName
              )}
              style={{ left: suffixLeft + SUFFIX_GAP_PX }}
            >
              {suffix}
            </span>
          </>
        )}
      </span>
      {onReset && !isDefault && (
        <div className="flex shrink-0 items-center pr-2">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Reset to default"
            onClick={onReset}
          >
            <Undo2Icon className="size-3.5!" />
          </Button>
        </div>
      )}
    </div>
  )
}

export { NumberField }
