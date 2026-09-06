'use client'

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

// Drag-to-dismiss for the bottom sheets (handoff 0014 G1): the handle and the header follow the finger, the sheet
// closes past DRAG_CLOSE_FRACTION of its height or on a fast downward flick, and snaps back on a short wobble.
// Pointer events only, no library; the drag surface sets `touch-action: none` so the page does not scroll under it.
// Handoff 0014b: the settle runs on the motion tokens (`--motion-base`, `--ease-out-soft`); SETTLE_MS mirrors the token so
// the phase ends with the transition. `transition: none` while the finger is down keeps the Sheet's leave transition
// (globals.css `.sheet-panel`) from smoothing the drag itself.
export const DRAG_CLOSE_FRACTION = 0.3 // of the sheet's height
export const DRAG_FLICK_PX_PER_MS = 0.5 // downward velocity over the last VELOCITY_WINDOW_MS
export const DRAG_FLICK_MIN_PX = 24 // a flick still needs this much travel; less is a wobble
const VELOCITY_WINDOW_MS = 100
const SETTLE_MS = 220 // = --motion-base

export function useDragDismiss(onClose: () => void) {
  const sheet = useRef<HTMLDivElement>(null)
  const start = useRef<{ y: number; id: number } | null>(null)
  const samples = useRef<{ y: number; t: number }[]>([])
  const [dy, setDy] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'drag' | 'settle'>('idle')

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || phase === 'settle') return
    start.current = { y: e.clientY, id: e.pointerId }
    samples.current = [{ y: e.clientY, t: e.timeStamp }]
    e.currentTarget.setPointerCapture(e.pointerId)
    setPhase('drag')
  }, [phase])

  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!start.current || e.pointerId !== start.current.id) return
    const y = Math.max(0, e.clientY - start.current.y)
    samples.current.push({ y: e.clientY, t: e.timeStamp })
    samples.current = samples.current.filter((s) => e.timeStamp - s.t <= VELOCITY_WINDOW_MS)
    setDy(y)
  }, [])

  const release = useCallback((e: PointerEvent<HTMLElement>, cancelled: boolean) => {
    if (!start.current || e.pointerId !== start.current.id) return
    const travel = Math.max(0, e.clientY - start.current.y)
    const first = samples.current[0]
    const velocity = first && e.timeStamp > first.t ? (e.clientY - first.y) / (e.timeStamp - first.t) : 0
    start.current = null
    samples.current = []
    const height = sheet.current?.offsetHeight ?? 0
    const flick = velocity > DRAG_FLICK_PX_PER_MS && travel > DRAG_FLICK_MIN_PX
    const past = height > 0 && travel > height * DRAG_CLOSE_FRACTION
    setPhase('settle')
    if (!cancelled && (flick || past)) {
      setDy(height)
      setTimeout(onClose, SETTLE_MS)
    } else {
      setDy(0)
      setTimeout(() => setPhase('idle'), SETTLE_MS)
    }
  }, [onClose])

  const dragProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: PointerEvent<HTMLElement>) => release(e, false),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => release(e, true),
    style: { touchAction: 'none' } as CSSProperties,
  }
  const sheetStyle: CSSProperties = {
    transform: dy ? `translateY(${dy}px)` : undefined,
    transition: phase === 'drag' ? 'none' : phase === 'settle' ? `transform ${SETTLE_MS}ms var(--ease-out-soft)` : undefined,
  }
  return { sheet, dragProps, sheetStyle, dragging: phase === 'drag' && dy > 0 }
}
