// One stroke icon set for chrome, so the bar, the toggle and the FAB share a weight. Ported from the spike.
const paths = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  list: 'M4 6h16M4 12h16M4 18h16',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  quests: 'M5 21V4M5 4h11l-2.5 4L16 12H5',
  journal: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 8.5h.01',
  you: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  sliders: 'M4 6h16M7 12h10M10 18h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
  book: 'M12 6.5C10.5 5.3 8.4 4.8 5 5v13c3.4-.2 5.5.3 7 1.5 1.5-1.2 3.6-1.7 7-1.5V5c-3.4-.2-5.5.3-7 1.5zM12 6.5v13',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
} as const satisfies Record<string, string>

export type IconName = keyof typeof paths

export const Icon = ({ name, size = 22, className = '' }: { name: IconName; size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={paths[name]} />
  </svg>
)

// The "studied" mark: an open book, amber. One glyph everywhere so it becomes vocabulary.
export function StudiedMark({ size = 20, className = '', title }: { size?: number; className?: string; title: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-amber text-white shadow-sm ${className}`} style={{ width: size, height: size }} title={title}>
      <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} aria-hidden><path d={paths.book} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /></svg>
    </span>
  )
}

// The "seen" mark: a check, green. Same size and shape: book left = studiert, check right = entdeckt.
export function SeenMark({ size = 20, className = '', title }: { size?: number; className?: string; title: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-moss text-white shadow-sm ${className}`} style={{ width: size, height: size }} title={title}>
      <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  )
}
