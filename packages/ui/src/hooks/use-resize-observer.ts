import { useEffect } from "react"

/** Invoke a callback whenever the referenced element resizes. */
export function useResizeObserver({
  ref,
  onResize,
}: {
  ref: React.RefObject<HTMLElement | null>
  onResize: (entry: ResizeObserverEntry) => void
}) {
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onResize(entry)
      }
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref, onResize])
}
