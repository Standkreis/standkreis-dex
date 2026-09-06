# 💬 [0003] Grilling — the scan is Claude Sonnet 5 held to the region's set; BioCLIP 2 waits for the day money is the constraint

> **Immutable.** A reversal is a new record that supersedes this one; a refinement is a dated
> entry under 📎 Addenda. The body above that line never changes.

| 🗓️ Date | 👤 Participants | 🤖 Model |
| --- | --- | --- |
| 2026-09-06 | Sven Reiser, with Claude Fable 5.1 | claude-fable-5-1 |

## ⬆️ Input

- [Handoff 0015](../handoffs/0015-snap-and-send-grill.md) I1–I8 and [0015b](../handoffs/0015b-bioclip-local.md) B1–B5; the probe `app/scripts/id-probe/` (Node for Pl@ntNet and Claude, Python for BioCLIP 2), 93 paid calls, ≈ 1.20 $.
- The fixture: 18 of the owner's photos, `docs/research/walks/01/` (images ignored, `labels.csv` tracked). Ten whole trees at 20–50 m in mist, three cultivated pot plants and a pumpkin, one mantis, one forest scene, two drone shots, one cherry with fruit. **None taken in Mainz-Bingen** (Schauerberg, Dahn, Kirrberg, Oestrich-Winkel); scored against Mainz-Bingen's set of 929 anyway.
- [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md): "the ID engine is a commodity you rent"; §⚖️ exact places never leave the phone; "explaining taxon ladder".
- M9's finding, owner: *"the walk only becomes useful with autorecognition."*

## ⬇️ Output

- **Decisions** below; findings [0015](../handoffs/0015-snap-and-send-grill-findings.md) with the 18 × 9 table, three ladders, costs, terms, decision cells filled.
- **Roadmap:** M12 rewritten from this record; a parked row for the BioCLIP fallback.
- **Next:** [handoff 0016](../handoffs/0016-snap-and-send.md), the M12 build.

## 🎯 Facts

| Fact | Source | Moved |
| --- | --- | --- |
| Sonnet 5 constrained to the 929: ✅7 🟡5 ⬜3 ❌3 of 18; free: ✅5 🟡7 ⬜1 🔸2 ❌3. The set turns all three cultivated cases into an honest "outside the set" (0.85–0.9, the real thing named alongside) and forces the forest scene into one conifer | findings 0015 §📊 | I1, I3 |
| Pl@ntNet raw: ✅1 🟡6 🔸9 ❌2. Never says "not a plant" (the mantis → *Chondrilla juncea* 0.009, HTTP 200). `organs=habit` byte-identical on 18/18 | §📊, §💸 | I1, I2 |
| Opus 5 free on the ten misty trees: ✅1 🟡4 ⬜3 🔸1 ❌1, 19 s median, 4× the price. Honesty, not hits | §📊 | I5 |
| BioCLIP 2, set + 149 cultivated distractors: ✅6 🟡4 🔸7 ❌1, 33 ms on MPS, 0.13 s on two CPU threads. Set alone: bonsai → blackbird, *Schefflera* → dormouse, pumpkin → rust fungus. Open set: another continent on 11 of 18 rows | §🧬 | I8, B1, B2 |
| No engine names a species from a whole tree at 20 m in mist that the app may show as one; fruit and flowers carry, silhouette does not. Every engine's own hint asks for leaf, fruit, bark | §📊 rows 1–8, 11 | I2 |
| Sonnet set: 1.4 ¢ and 6 s per photo with the 19 k-token set prompt cached (0.39 ¢ per read); 28 ¢ per 20-photo walk; 2.8 $ a day for ten users | §💸 | I5 |
| BioCLIP hosting: Hetzner CX23 5.99 €/month flat; HF Inference Endpoints 1.4–9.7 €/month scale-to-zero with minutes of cold start; on-device ≈ 305–610 MB Core ML, not reachable from a PWA | §🧬 B4 | I8, B4 |
| Terms: Pl@ntNet keeps photos in volatile memory only; Anthropic deletes API inputs within 30 days and does not train on them. A browser re-encode (`canvas.toBlob`) drops EXIF; sharp without `withMetadata()` does too, 18/18 | §💸, §❓ I6 | I6 |

## 🗳️ Decisions

| # | Decision | Why |
| --- | --- | --- |
| I1 | **Claude Sonnet 5, constrained to the region's set, is the one engine.** Pl@ntNet is not in v1 | The scan is the moment the app explains: ladder, evidence, "several", "outside the set, probably a Schefflera", the next-photo hint. Only Sonnet produces those. Pl@ntNet cannot say "not a plant" and a second code path buys 0 ✅ |
| I2 | **The camera screen asks for a close shot before it names anything at species rank.** Sentence: *"Bitte einmal nah heran: ein Blatt, eine Frucht in der Hand, die Rinde — daran lassen sich Apfel, Birne und Kirsche unterscheiden."* | Ten misty trees, no engine better than genus with honesty |
| I3 | **The set constrains the answer; a gate runs first.** Same call, JSON `subject: single \| several \| none`, then `answer` from the list or `outside`, with `if_outside` naming the free guess. Species rank shown only at confidence ≥ 0.7, else genus | Set: +2 ✅, three honest "outside". Gate: repairs the scene. Threshold: removes two of Sonnet's three confident errors on the fixture |
| I4 | **The ladder is Claude's JSON** (`ladder.family/genus/species`, `evidence[]`, `hint_de`), joined to the set by exact `sciName`, out-of-set names through `taxon.search` | Three ladders written out from real responses, every rung filled |
| I5 | **1.4 ¢ per photo is accepted** | 28 ¢ per walk; nothing to operate |
| I6 | **The server proxies.** Browser re-encodes to ≤ 1600 px (EXIF gone), tRPC mutation holds the key, forwards, returns JSON, stores nothing unless the sighting is saved | Keys never ship in the bundle; §⚖️ holds: no place, no date leaves the phone |
| I7 | **Offline goes through the outbox.** Snap without network saves "unbestimmt" with the photo; the flush identifies; the journal row gets the ladder with a badge. Screen says *"kein Netz · wird beim nächsten Mal bestimmt"* | "Erst online" loses the sighting |
| I8 B4 | **BioCLIP 2 is not built now. It is the named fallback for the day money is the constraint** (§🔁) | Matches Sonnet on hits, beats it on confident errors, costs 0 ¢ per photo and 6 €/month for a box, keeps the photo on owner-run hardware. Loses on words, which is the product today |

## 🔁 The fallback, so nobody forgets

Owner 2026-09-06: *"go with Sonnet for now, if it becomes too expensive we go with BioCLIP; keep a reference."*

| Trigger | Then |
| --- | --- |
| Sonnet spend on `sighting.identify` passes what a Hetzner CX23 costs (≈ 6 €/month ≈ 430 photos/month), or a region needs the photo to stay on owner hardware | Build 0015b's run C as a service: `app/scripts/id-probe/bioclip/probe.py` is the seed; the 929 + distractor labels embed once per region (216 s on MPS, cache the tensor); margin gate 0.3 / 0.1; Sonnet stays for the words on the top-3 only, or the ladder becomes text from the set's own data |
| Where | Hetzner CX23, 2 vCPU 4 GB, ≈ 0.5 s per photo; or HF Inference Endpoints scale-to-zero if cold starts are acceptable |
| What is already on file | `bioclip/{README.md,taxonomy.mjs,probe.py,taxonomy.json,distractors.json}`, findings 0015 §🧬 with the margin bands and the hosting table |

## 🧭 Reasoning and rejected alternatives

- **Pl@ntNet as the engine.** Free and fast, but wrong on 11 of 14 plants here, forces a species on a mantis, a bonsai and a pumpkin, and its organ hint is a no-op. Rejected for v1; the GBIF keys it returns are the one thing worth revisiting.
- **Opus.** Four times the money and three times the wait for honesty Sonnet gets from the gate and the threshold.
- **Client-side calls.** Would ship two keys and a 19 k-token prompt in a PWA bundle. Rejected.
- **"Erst online" for the scan.** Loses the moment. The outbox already exists and carries photos.
- **BioCLIP now.** A second host to operate before a single user has scanned anything. The fixture is also wrong-region whole trees; the decision may flip on a real Mainz-Bingen walk with close-ups, which is a risk below, not a reason to build two engines.

## ⚠️ Risks

| Risk | Watch |
| --- | --- |
| The fixture is 18 photos from the wrong Landkreis, mostly whole trees | First real walk in Mainz-Bingen with close-ups is the second fixture; re-run `score.mjs` before M12 ships |
| Sonnet's three confident errors were all trees of the same family; the threshold hides them but a user on the path sees "Gattung Malus" and wants more | The ladder explains why: that is the product, not a bug |
| Set prompt at 19 k tokens per region; a region with 3 000 species is 60 k | Cache per region; above ~40 k, send the tile's subset (the user picked their tiles) |
| Anthropic prices or terms change | The 🔁 table above |

---

## 📎 Addenda
