// Step 0 of the ID grill (handoff 0015 §🛠️): crops the Photos-app chrome off the screenshots, strips EXIF from all 18,
// writes docs/research/walks/01/prep/<n>.jpg (≤ 1600 px long edge) and labels.csv from the handoff's guess table.
// Throwaway. Run from app/: node scripts/id-probe/prep.mjs
import sharp from 'sharp'
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const WALK = new URL('../../../docs/research/walks/01/', import.meta.url).pathname
const OUT = join(WALK, 'prep')
mkdirSync(OUT, { recursive: true })

// The handoff's §📁 table, verbatim. The owner corrects guess / inSet and fills the owner* columns.
const GUESSES = [
  ['IMG_3084.PNG', 'Pyrus communis', 'whole tree, distance', 'likely'],
  ['IMG_3085.PNG', 'fruit tree (Malus/Pyrus)', 'whole tree, distance', '?'],
  ['IMG_3086.PNG', 'Malus domestica', 'whole tree, distance', '?'],
  ['IMG_3087.PNG', 'Pyrus communis or Juglans regia', 'whole tree, distance', '?'],
  ['IMG_3088.PNG', 'Juglans regia or Fraxinus excelsior (young)', 'young tree', '?'],
  ['IMG_3089.PNG', 'Malus domestica', 'whole tree, distance', '?'],
  ['IMG_3090.PNG', 'Prunus avium', 'whole tree, distance', '?'],
  ['IMG_3091.PNG', 'old fruit tree (Malus/Pyrus)', 'whole tree, distance', '?'],
  ['IMG_3092.PNG', 'bonsai (Olea europaea or Ficus)', 'pot plant, cultivated', 'no'],
  ['IMG_3093.PNG', 'Schefflera arboricola', 'pot plant, cultivated', 'no'],
  ['IMG_3094.PNG', 'Juglans regia (young)', 'young tree', '?'],
  ['IMG_3095.PNG', 'Mantis religiosa', 'animal, close-up', 'yes'],
  ['IMG_3096.PNG', 'several (Quercus, Pinus)', 'scene, several species', 'several'],
  ['IMG_3097.PNG', 'Cucurbita pepo', 'crop, cultivated', 'no'],
  ['PHOTO-2026-09-06-19-29-38.jpg', 'Prunus avium', 'tree, fruit visible', 'yes'],
  ['PHOTO-2026-09-06-19-29-44.jpg', 'Prunus spinosa, Prunus avium or Prunus cerasifera', 'shrub, flowers visible', 'likely'],
  ['PHOTO-2026-09-06-19-29-45.jpg', 'white-flowering tree (Prunus?)', 'drone, top-down', '?'],
  ['PHOTO-2026-09-06-19-29-45 2.jpg', 'several (flowering Prunus?)', 'drone, oblique, several', 'several'],
]

/** Mean luminance per row of a 120 px wide greyscale copy, scaled back to source rows. */
async function rowRuns(file, height) {
  const { data, info } = await sharp(file).greyscale().resize({ width: 120 }).raw().toBuffer({ resolveWithObject: true })
  const runs = []
  let start = null
  for (let y = 0; y <= info.height; y++) {
    let on = false
    if (y < info.height) {
      let s = 0
      for (let x = 0; x < info.width; x++) s += data[y * info.width + x]
      on = s / info.width > 18 // black chrome rows (status bar, buttons on black) stay under this; photo rows are far above
    }
    if (on && start === null) start = y
    if (!on && start !== null) { runs.push([start, y]); start = null }
  }
  const k = height / info.height
  return runs.map(([a, b]) => [Math.round(a * k), Math.round(b * k)])
}

/**
 * Two Photos-app layouts in the fixture (checked by eye on a downscaled contact sheet):
 *   full-screen crop editor: the photo fills 1206 × 2622, only a crop icon at the top right (rows ≈ 40–140) → cut 150 px top;
 *   detail view: black chrome top and bottom, the photo is the longest bright run of rows (the thumbnail strip is a short one).
 */
async function cropBand(file) {
  const { width, height } = await sharp(file).metadata()
  const runs = await rowRuns(file, height)
  const longest = runs.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a), [0, 0])
  if (longest[1] - longest[0] > 0.9 * height) return { top: Math.max(150, longest[0]), bottom: longest[1], width, height, layout: 'fullscreen' }
  return { top: longest[0] + 4, bottom: longest[1] - 4, width, height, layout: 'detail' }
}

const rows = [['n', 'file', 'guess', 'kind', 'inSet', 'ownerName', 'ownerSci', 'inMainzBingen']]
const bands = []
for (let i = 0; i < GUESSES.length; i++) {
  const [file, guess, kind, inSet] = GUESSES[i]
  const n = i + 1
  const src = join(WALK, file)
  let img = sharp(src)
  if (/\.png$/i.test(file)) {
    const b = await cropBand(src)
    bands.push({ n, file, ...b })
    img = img.extract({ left: 0, top: b.top, width: b.width, height: b.bottom - b.top })
  }
  // sharp drops every metadata block (EXIF, GPS, ICC, XMP) unless withMetadata() is called: nothing survives here.
  await img.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(join(OUT, `${n}.jpg`))
  const m = await sharp(join(OUT, `${n}.jpg`)).metadata()
  console.log(`${String(n).padStart(2)}  ${file.padEnd(32)} → prep/${n}.jpg ${m.width}×${m.height}  exif=${m.exif ? 'YES' : 'none'}`)
  rows.push([n, file, guess, kind, inSet, '', '', ''])
}
console.table(bands.map((b) => ({ n: b.n, file: b.file, layout: b.layout, top: b.top, bottom: b.bottom })))
const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\n') + '\n'
writeFileSync(join(WALK, 'labels.csv'), csv)
console.log('wrote labels.csv with', rows.length - 1, 'rows')
