import type { Tile } from '@/generated/prisma/enums'

// The group icons of the onboarding tiles (findings 0002 revision 3: the silhouette survives only here and as the
// fallback for species without an image). Hand-placed primitives from the spike, viewBox 0 0 100 100. No AI imagery.
const SHAPES: Record<Tile, string> = {
  bird: '<ellipse cx="46" cy="56" rx="27" ry="17"/><circle cx="68" cy="40" r="13"/><polygon points="79,38 94,43 79,45"/><polygon points="22,60 2,74 8,58 4,48 24,52"/><rect x="40" y="70" width="3" height="12"/><rect x="52" y="70" width="3" height="12"/><rect x="34" y="81" width="12" height="2.5"/><rect x="46" y="81" width="12" height="2.5"/>',
  mammal: '<ellipse cx="50" cy="52" rx="28" ry="15"/><circle cx="78" cy="42" r="10"/><polygon points="84,34 90,18 92,38"/><polygon points="74,34 76,20 82,36"/><polygon points="86,44 98,50 86,50"/><polygon points="24,50 4,42 6,62 26,60"/><rect x="30" y="62" width="6" height="22"/><rect x="42" y="64" width="6" height="20"/><rect x="58" y="64" width="6" height="20"/><rect x="68" y="62" width="6" height="22"/>',
  insect: '<ellipse cx="50" cy="52" rx="5" ry="26"/><circle cx="50" cy="24" r="5"/><path d="M47 40 C 20 10, 5 30, 12 48 C 16 58, 34 56, 47 50 Z"/><path d="M53 40 C 80 10, 95 30, 88 48 C 84 58, 66 56, 53 50 Z"/><path d="M47 54 C 30 56, 18 70, 26 80 C 32 88, 46 76, 48 62 Z"/><path d="M53 54 C 70 56, 82 70, 74 80 C 68 88, 54 76, 52 62 Z"/><polygon points="47,20 38,6 40,5 49,19"/><polygon points="53,20 62,6 60,5 51,19"/>',
  plant: '<polygon points="48,92 48,20 52,20 52,92"/><path d="M50 30 C 30 30, 18 45, 20 62 C 38 62, 50 50, 50 30 Z"/><path d="M50 44 C 70 44, 82 58, 80 76 C 62 76, 50 64, 50 44 Z"/><path d="M50 22 C 40 14, 42 2, 50 4 C 58 2, 60 14, 50 22 Z"/>',
  fungus: '<path d="M10 50 C 10 25, 30 12, 50 12 C 70 12, 90 25, 90 50 Z"/><rect x="40" y="48" width="20" height="40" rx="6"/><ellipse cx="50" cy="88" rx="16" ry="5"/>',
  amphibian: '<ellipse cx="50" cy="58" rx="28" ry="18"/><circle cx="66" cy="42" r="12"/><circle cx="72" cy="32" r="5"/><circle cx="58" cy="32" r="5"/><path d="M28 66 C 10 60, 4 76, 12 84 C 20 90, 30 80, 28 66 Z"/><path d="M72 66 C 88 62, 96 74, 90 82 C 82 88, 74 78, 72 66 Z"/>',
  reptile: '<ellipse cx="50" cy="50" rx="10" ry="24"/><ellipse cx="50" cy="20" rx="8" ry="9"/><path d="M50 70 C 52 84, 44 92, 36 96 C 46 94, 56 88, 54 70 Z"/><polygon points="42,36 22,26 20,30 42,42"/><polygon points="58,36 78,26 80,30 58,42"/><polygon points="42,58 22,68 20,64 42,52"/><polygon points="58,58 78,68 80,64 58,52"/>',
  // The fish is new since the spike (record 0002 E12): body, tail, one fin, one eye.
  fish: '<ellipse cx="46" cy="50" rx="30" ry="16"/><polygon points="74,50 96,34 92,50 96,66"/><path d="M40 36 C 44 24, 56 24, 60 36 Z"/><path d="M40 64 C 44 76, 56 76, 60 64 Z"/><circle cx="28" cy="46" r="3" fill="var(--color-tile)"/>',
}

export function OnboardingSilhouette({ tile, className = '' }: { tile: Tile; className?: string }) {
  return (
    <svg viewBox="-6 -6 112 112" className={className} aria-hidden>
      <g fill="currentColor" dangerouslySetInnerHTML={{ __html: SHAPES[tile] }} />
    </svg>
  )
}
