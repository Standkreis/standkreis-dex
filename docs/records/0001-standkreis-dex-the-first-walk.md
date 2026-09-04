# 💬 [0001] Grilling — a Pokédex for nature is a collection layer over open data, and the first slice is one complete walk

> **Immutable.** A reversal is a new record that supersedes this one; a refinement is a dated
> entry under 📎 Addenda. The body above that line never changes.

| 🗓️ Date | 👤 Participants | 🤖 Model |
| --- | --- | --- |
| 2026-09-04 | Sven Reiser, with Claude Fable 5.1 | claude-fable-5-1 |

## ⬆️ Input

- The brief: a hybrid web + mobile app to track flora and fauna you have encountered or want to learn about, gamified like a Pokédex, to get people outside. Four steps agreed: research → HITL → grill → mocked UI exploration.
- Step 1, [`docs/research/01-market-research.md`](../research/01-market-research.md): eight parallel research passes over ~30 apps, gamification literature, voice of customer, market and feasibility. Seven raw files under [`docs/research/raw/`](../research/raw/).
- Step 2, [`docs/research/03-hitl-notes.md`](../research/03-hitl-notes.md): Sven's field notes on Seek. Agreed with all of the research and added nine product observations, which entered this grill as settled inputs rather than questions.
- Scoping answers given before research: curious casuals with Sven as user #1 · global from day one · no connection to the Standkreis land project · hobby / portfolio.
- No repository, no issue tracker yet. The grill skill's interview format was followed; its tracker mechanics were not. This record and its spec are numbered 0001 and land as files.

## ⬇️ Output

- **Spec:** [`docs/specs/0001-standkreis-dex-the-first-walk.md`](../specs/0001-standkreis-dex-the-first-walk.md).
- **Issue:** none exists. When a repository and tracker are created, an epic should be opened and this record linked from it.
- **§4 recommendation:** proceed to **step 4, the mocked UI exploration**, against §🎨 of the spec. The first slice is one slice; when the UI is settled it routes to implementation, not to a plan.

## 🎯 Facts

What was looked up rather than asked, and the decision each moved.

| Fact | Source | Moved |
| --- | --- | --- |
| Seek, the only incumbent gamified all-taxa collector, has had no updates in 2026; staff redirect users to the new iNaturalist app | iNat forum staff reports; competitor comparison | Q2 · Q10 — the slot is open and nobody is defending it |
| Ten near-identical solo-dev "dex games" launched late 2025 to mid 2026; all under 600 ratings; several already stalling | dobudex comparison, App Store, HN | Q4 · Q10 — camera-first dex games are not proving retention |
| Birdex (UK) has the most traction of any dex game and uses **no AI**: honor-system logging, cards, quests. 200k sightings in weeks | Time Out, Android Police, AppBrain | Q1 · Q4 — the collection is the hook, the camera is the assist |
| The median iNaturalist user makes 3 observations on 3 days per year; top 1% contribute ~62% | Di Cecco et al. 2021, *BioScience* | Q8 · Q10 — retention, not acquisition, is the product |
| iNaturalist staff refuse gamification on record: leaderboards "provide a lot of incentives for bad behavior … can reduce data quality, sometimes significantly" | iNat forum, tiwane 2019 and 2023 | Q8 — no XP, no leaderboards; the science platform will not build this layer |
| City Nature Challenge bingers stop observing for the rest of the year; only 1 of 130 cities with 1,000 species reached 80% Research Grade | iNat forum 2026 | Q8 — weekly rhythm with freezes, no binge mechanics |
| Rarity-weighted points pull effort toward the species that get misidentified and disturbed | Atsumi et al. 2024, *eLife* (Biome, Japan) | Q8 · ethics rules — no rarity multipliers |
| Seek's #1 complaint is losing all observations and badges on a new phone; no backup exists | App Store, Kimola review analysis | Q3 — identity must survive a device change |
| The most-upvoted iNaturalist feature request since 2019, still unbuilt, is a browsable life list / tree of life with gaps shown | iNat forum | Q2 · Q10 — the silhouette grid is the unmet want |
| iNaturalist's computer-vision model is closed to third parties; only a ~500-taxon model is open. BioCLIP 2 is MIT but a ViT-L, server-side | iNat forum staff, Hugging Face | Q4 — live on-device recognition is months of ML; snap-and-send is not |
| Pl@ntNet API: free to 500 IDs/day, non-profit tier free with logo. Kindwise, Gemini exist as fallbacks; multimodal LLMs score ~10–12% on fine-grained bird ID | my.plantnet.org, arXiv 2026 | Q4 · Q6 — plants are solved for free; LLMs are for prose, not ID |
| BirdNET models, most Xeno-canto sounds and a large share of iNaturalist photos are CC BY-NC | GitHub, Xeno-canto, iNat help | Q6 — "free forever" unlocks them; "maybe paid" forfeits them today |
| iOS evicts PWA storage after ~7 days unused; no store listing for PWAs | MagicBell 2026 | Q5 — PWA is the first step, not the last |
| Apple 4.2 rejects WebView wrappers that are "just a website"; Play Families forbids location for child-targeted apps | App Store guidelines, Play policy | Q5 · who — 13+, native touches in the wrap |
| **GloBI** publishes recorded species interactions (eats, eatenBy, pollinates, hostOf, parasiteOf) via a public API; EOL TraitBank and IUCN carry habitat | globalbioticinteractions.org, EOL | Q7 — the ecology Sven asked for exists structured and nobody uses it |
| PictureThis's trial-to-$39.99 auto-renew is the single loudest complaint in the category; Birda lost trust moving free features behind a paywall | Trustpilot, App Store | Q6 — pricing honesty is a differentiator |
| Wildex's Hacker News launch was dominated by "points incentivise approaching wildlife" and poaching-location risk | HN thread, Feb 2026 | ethics rules — obscure, coarsen, no location-pinned quests |
| § 44 BNatSchG: publishing nest or roost sites of strictly protected species can constitute significant disturbance | gesetze-im-internet.de | ethics rules — auto-obscure protected taxa |

## 🗳️ Decisions

Legend: 🙋 = the human overrode the agent.

| # | Question | Decision | Builds on |
| --- | --- | --- | --- |
| — | Settled by HITL notes, not asked | Bottom app bar · home is the dex under global filters with grid, list and map · live camera stays desirable · claim without proof allowed · rich compact species page with an ecology section · personal paced quests, no public mission pool · a real onboarding | step 2 |
| Q1 | The atom you collect | **Sightings journal, dex derived.** Every encounter is a record; a species is discovered on its first sighting. Sessions and places derivable later | HITL 4 · 6 · 7 |
| Q2 | What populates the dex | **Regionally plausible set**, thresholded from GBIF + iNaturalist occurrence per cell and month; full backbone searchable when logging | Q1 · HITL 2 |
| Q3 | Identity | **Anonymous-first, passkey/email upgrade for sync.** Export and delete in both states | Q1 · hybrid web + mobile |
| Q4 | Identification | **Snap-and-send** (Pl@ntNet + BioCLIP 2) with an explaining taxon ladder, **on top of claim-first logging**. No on-device live model in v1 | Q1 · HITL 5 · 6 |
| Q5 | Stack | **Next.js PWA first, Capacitor wrap** for the stores when a second user or a home screen needs it | Q4 |
| Q6 | Money | **Free forever**, donations as escape valve. Non-commercial assets are in | hobby / portfolio |
| Q7 | Species content | **Composed open sources** (GBIF, Wikidata, Wikipedia, GloBI, EOL, Commons, iNat, Xeno-canto) with the interaction graph as the ecology section; **LLM editor later**, grounded on that graph | Q6 · HITL 7 · 8 |
| Q8 | Progression | **Three weekly quests generated from your own state** (plausible-by-month, interaction graph, your history), on top of the silhouette grid. No XP, no leaderboards, no daily streak | Q1 · Q2 · Q7 · HITL 9 |
| Q8b | How learning counts | 🙋 **Two axes per species: studied and seen.** Studied renders outlined with a mark and counts on home; only seen fills the silhouette. Quests bridge the axes across seasons | Q8, reopened by owner |
| Q9 | Social in v1 | **Share-out cards only**, location coarsened. No friends, no feed | Q3 · Q6 |
| Q10 | The first slice | **One complete walk:** onboarding → plausible dex grid → species page → mark studied → log by search and claim → silhouette fills → anonymous sync. No AI ID, no quests, no share card, grid only | Q1–Q9 |

## 🔥 Reasoning

**Q1 — sightings, dex derived.** Sven's own notes asked for yearly occurrence, maps and personal progression, and all of those need dated, placed encounters underneath. It is also the only option with week-three content: a ticked box has nothing left to say about a blackbird, a journal says "fourteenth, first since October." Sessions and places fall out later by clustering. **Rejected — species-only dex:** the dex-game model, and every dex game stalls once the common species are ticked; Seek users report losing motivation at gold. **Rejected — sessions first:** "start a walk" is a ceremony before the first log, and Birda users complain about exactly that. **Rejected — places first:** a later layer, not a foundation.

**Q2 — the plausible set.** Pokémon GO's real hook is the visible gap, and a gap only pulls if it is fillable. Thresholded occurrence data gives silhouettes of what could actually be found on Saturday, anywhere on Earth, from free data, and it is the "filters shrink the infinite list" experience Sven praised, made the centre. The threshold is curation by arithmetic. **Rejected — everything:** recreates the overwhelm flagged in the field notes; a dex where 99% of silhouettes can never be filled has no pull. **Rejected — user-built only:** no gaps, nothing to hunt, and "want to learn about" needs unmet species visible. **Rejected — curated tiers:** the right quality, unaffordable globally for one person.

**Q3 — anonymous-first.** Seek's frictionless first minute and Seek's data-loss disaster are the same design problem solved twice. Minting an identity silently, then offering a passkey when there is a motive ("see this on your laptop"), keeps screen one engaging and makes sync, export and deletion honest one-screen features. **Rejected — no account ever:** structurally rules out the hybrid asked for, and is the failure mode people leave Seek over. **Rejected — account up front:** PictureThis shows what a form-first launch does to trust, with no subscription here to justify it. **Rejected — social sign-in only:** a fine option inside the upgrade step, not the model.

**Q4 — snap-and-send on claim-first.** The agent challenged Sven's note that live recognition "feels amazing": it does, and it is the one feature that needs a mobile model nobody will give you and forces native early. Snap-and-send gets most of the feeling at a fraction of the cost, keeps the stack open, and pauses to teach, which live recognition never does. Claim-first stays the primary way in. **Rejected — live on-device for v1:** months of ML before the collection exists; the research is unanimous that the collection is the hook. **Rejected — delegate to Seek or Merlin:** the app whose job is "remember to log it" loses to the app that answered. **Rejected — no AI at all:** defensible on Birdex's evidence, but forfeits the unknown-species learning moment the brief depends on.

**Q5 — PWA, then Capacitor.** One developer, hobby cadence, Next.js fluency. Weeks one to eight in a browser on the existing stack; the wrap adds camera, GPS, offline SQLite and haptics without a rewrite, and the native touches Apple demands are the ones the product wants. **Rejected — Expo alongside Next.js:** two UI codebases is what kills solo hobby projects. **Rejected — PWA as the end state:** iOS storage eviction makes it a Seek-grade data-loss story waiting to happen. **Rejected — Expo alone:** throws away the strongest skill for no gain once live camera is off the table.

**Q6 — free forever.** Not about revenue, about licences: BirdNET, Xeno-canto and much of iNaturalist's photo pool are non-commercial, and Pl@ntNet is free for non-profits. Free-forever is the honest reading of "hobby and portfolio," the strongest trust signal available in a category defined by paywall anger, and it hands over bird sound and the richest photo pool without a negotiation. Donations cover a GPU box if strangers show up. **Rejected — freemium from day one:** paywall screens before week three exists, on a model ten competitors are failing at now. **Rejected — free with the door open:** pays a real cost today (thinner sounds, fewer photos, no BirdNET) for an option Sven said he does not intend to exercise. Keeping doors open is only free when it is free.

**Q7 — composed open sources, LLM editor later.** GloBI turns Sven's "inputs and enemies" into a graph no competitor has, and the graph does double duty as the ecology section and as a quest generator. Coverage gaps become honest empty states. The editor model becomes a weekend once the graph exists, and grounded because it does. **Rejected — LLM-written pages:** a learning product that teaches wrong food webs is worse than one that says "no data yet," and inherits the AI-trust backlash iNaturalist suffered. **Rejected — Wikipedia only:** the stub everyone ships and the exact Seek complaint. **Rejected — editor first:** polish before substance.

**Q8 — generated weekly quests on the silhouette grid.** Three active quests computed from the plausible-by-month set, the interaction graph and the user's own history make the next walk specific ("the bramble is fruiting and you've never logged a comma") without a menu or a number that inflates. Weekly with a freeze, because nature is seasonal and Duolingo's own data says bingers churn. **Rejected — XP, levels and taxon badges:** the most-copied mechanic and the most-documented failure; Biome shows scoring pulls behaviour the wrong way. **Rejected — hand-authored catalogue:** Sven's own note, and authored content is what a hobby project stops producing by month two. **Rejected — silhouettes only:** the floor the quests stand on, not an alternative.

**Q8b — two axes.** 🙋 Sven pushed back that learning must count as progress: curiosity is a real driver, winter is real, and the brief said "encountered *or want to learn about*." The agent had built Q8 as if only the forest counted, and conceded. The named risk in the pushback is that reading fills the dex and the forest becomes optional; the fix is structural: studied and seen are separate axes on the same species, only seen fills, and quests bridge them across seasons. **Rejected — same progress for both:** the one option that could quietly kill the purpose while the metrics look great. **Rejected — study before you claim:** makes the app the obstacle between the user and the animal. **Rejected — learning informational only:** the agent's original framing, corrected by the owner.

**Q9 — share-out cards.** A portfolio project gets seen without becoming a network to run. A card of your own photo filling a silhouette is the Gotcha moment and the Birdex press hook, and costs one render route; coarsened location by default handles the poaching rule with no settings page. **Rejected — friends and feed for v1:** where every competitor's ethics, privacy and moderation load lives, and none of it helps on a rainy Tuesday; both stay possible on the Q3 identity model. **Rejected — nothing:** leaves the one cheap growth lever on the table.

**Q10 — one complete walk.** The smallest thing that is the product: silhouettes, learning, claiming, filling, syncing. If that loop does not get Sven out the door, no AI or quest layer will, and he finds out in three weeks rather than three months. It forces the plausible-set ETL to exist with a use attached. **Rejected — full v1:** the hobby-project death pattern. **Rejected — camera first:** every dex game led with the camera and every one has under 600 ratings. **Rejected — data layer alone:** a fine first week inside the slice, but never answers whether you'd open it.

## 📌 Risks and open mechanics

- **The threshold is the product.** If the plausible set shows 900 species or 40, the grid is wrong. Cell size, observation threshold and the month dimension need tuning against real data with Sven's eyes on it, inside the first slice.
- **Coverage is European-deep, elsewhere thin.** GloBI, EOL and Wikipedia are rich for Germany and thin for many regions. "Global from day one" is true for the plausible set and honest-empty-state for ecology. Say so in the UI.
- **Studied must cost something.** If marking studied is a single tap, the axis inflates and means nothing. The two-question recap is deferred to the quest grill; until then the risk is accepted.
- **Rate limits.** iNaturalist recommends ≤ 60 requests/min and ≤ 10k/day. The ETL must be scheduled and cached, never request-time.
- **Attribution debt.** Every image, sound and text fragment must carry its licence from day one; retrofitting is how NC assets leak into a public product.
- **Free-forever is a one-way door.** Reversal drops BirdNET, Xeno-canto and iNat NC photos from a product people use. Recorded as a decision, not an assumption.
- **The agent's own pattern.** The agent initially under-served the "want to learn about" half of the brief (Q8 → Q8b). Future grills on quests and recaps should re-read the first sentence of the brief before recommending.

## 📚 Related

- [`docs/research/01-market-research.md`](../research/01-market-research.md) — synthesis
- [`docs/research/02-hitl-checklist.md`](../research/02-hitl-checklist.md) — field-test protocol
- [`docs/research/03-hitl-notes.md`](../research/03-hitl-notes.md) — Sven's notes
- [`docs/research/raw/`](../research/raw/) — seven raw research files with all URLs
- Sibling record, different product: `monorepo/docs/records/0009-grill-what-standkreis-is-and-what-it-refuses-to-be.md`, which deferred a "Collector" app as a capture mode into a place. This project is explicitly *not* that Collector: no connection to Standkreis, per the scoping answer. If the two ever meet, that is a new grill.

## 📎 Addenda
