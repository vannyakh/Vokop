import { useEffect, useRef } from "react"

/**
 * Run a callback every animation frame with the elapsed delta time (ms).
 * Keep the callback referentially stable (useCallback) to avoid restarts.
 */
export function useRafLoop(callback: (deltaTimeMs: number) => void) {
  const requestRef = useRef<number>(0)
  const previousTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const loop = (time: number) => {
      if (previousTimeRef.current !== null) {
        callback(time - previousTimeRef.current)
      }
      previousTimeRef.current = time
      requestRef.current = requestAnimationFrame(loop)
    }

    requestRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(requestRef.current)
      previousTimeRef.current = null
    }
  }, [callback])
}
