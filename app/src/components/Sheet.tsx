'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useDragDismiss } from './useDragDismiss'

const SheetClose = createContext<() => void>(() => {})
// The open sheets, bottom to top: Escape closes only the topmost (the ⓘ sheet over the diary's drawer, not both).
const stack: (() => void)[] = []
/** The animated close of the enclosing Sheet, for the sheet's own buttons ("Schließen", "Später", the primary action). */
export const useSheetClose = () => useContext(SheetClose)

/**
 * The one bottom sheet (handoff 0014b A1): scrim, panel, drag handle, Escape, tap outside. Every sheet mounts through it,
 * so every sheet rises and leaves the same way (globals.css `.sheet-*`).
 *
 * The unmount rule: the caller still mounts the sheet conditionally (`{open && <X onClose={…} />}`) and `onClose` still
 * means "unmount me". Inside, `close()` first sets `data-state="closing"`, lets the panel's transform transition run, and
 * calls `onClose` on its `transitionend` (a timeout of the same length is the fallback). When the panel's computed
 * transition-duration is zero, reduced motion, `onClose` runs at once. A drag past the threshold already animates the
 * panel off screen (useDragDismiss), so that path calls `onClose` directly and skips the second leave.
 *
 * `handle` is what sits under the pill in the drag surface (a title row, or nothing); `children` is the body and owns
 * its own padding and scrolling. The panel is a flex column capped at `maxH`, so a `min-h-0 overflow-y-auto` child scrolls.
 */
export function Sheet({ onClose, labelledBy, z = 'z-30', maxH = 'max-h-[92vh]', handle, handleTestId, handleClassName = '', panelClassName = '', panelStyle, testId, children }: {
  onClose: () => void
  labelledBy: string
  z?: string
  maxH?: string
  handle?: ReactNode
  handleTestId?: string
  handleClassName?: string
  panelClassName?: string
  panelStyle?: CSSProperties
  testId?: string
  children: ReactNode
}) {
  const [closing, setClosing] = useState(false)
  const done = useRef(false)
  const finish = useCallback(() => { if (done.current) return; done.current = true; onClose() }, [onClose])
  const { sheet, dragProps, sheetStyle } = useDragDismiss(finish)
  const close = useCallback(() => {
    if (done.current || closing) return
    const ms = sheet.current ? parseFloat(getComputedStyle(sheet.current).transitionDuration) * 1000 : 0
    if (!(ms > 0)) return finish()
    setClosing(true)
    const el = sheet.current!
    const timer = setTimeout(finish, ms + 80)
    el.addEventListener('transitionend', (e) => { if (e.target === el && e.propertyName === 'transform') { clearTimeout(timer); finish() } })
  }, [closing, finish, sheet])
  useEffect(() => {
    stack.push(close)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && stack[stack.length - 1] === close) close() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); stack.splice(stack.indexOf(close), 1) }
  }, [close])
  return (
    <SheetClose.Provider value={close}>
      <div className={`sheet fixed inset-0 ${z} flex items-end`} data-state={closing ? 'closing' : 'open'} onClick={(e) => { e.stopPropagation(); close() }} role="presentation" data-testid={testId}>
        <div className="sheet-scrim absolute inset-0 bg-ink/40" aria-hidden />
        <div ref={sheet} role="dialog" aria-modal aria-labelledby={labelledBy} onClick={(e) => e.stopPropagation()}
          className={`sheet-panel relative mx-auto flex ${maxH} w-full max-w-[520px] flex-col rounded-t-3xl bg-paper text-ink ${panelClassName}`} style={{ ...sheetStyle, ...panelStyle }}>
          <div {...dragProps} className={`shrink-0 cursor-grab px-4 pt-3 select-none ${handleClassName}`} data-testid={handleTestId}>
            <div className="mx-auto h-1 w-10 rounded-full bg-ink/20" />
            {handle}
          </div>
          {children}
        </div>
      </div>
    </SheetClose.Provider>
  )
}

