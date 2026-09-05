# 🔬 coverage.mjs · Kyoto · whole-year set → 303 species · EOL/GloBI/siblings sampled 221 

## E8 · coverage per source
 

| source | species | share | of |
| --- | --- | --- | --- |
| sampled | 221 | 100% | 221 |
| dewiki | 140 | 46% | 303 |
| deIntro | 134 | 44% | 303 |
| enwiki | 237 | 78% | 303 |
| enIntro | 235 | 78% | 303 |
| iucn | 109 | 36% | 303 |
| anage | 47 | 16% | 303 |
| eolPage | 0 | 0% | 221 |
| eolHabitat | 0 | 0% | 221 |
| globiAny | 212 | 96% | 221 |
| globiZero | 9 | 4% | 221 |
| lookalike | 218 | 99% | 221 | 

## E9 · GloBI interactions
 

| kind | edges |
| --- | --- |
| eats | 13694 |
| eatenBy | 12682 |
| hasHost | 6996 |
| hostOf | 6740 |
| preysOn | 6152 |
| preyedUponBy | 5054 |
| interactsWith | 4798 |
| visitsFlowersOf | 2420 |
| flowersVisitedBy | 2416 |
| symbiontOf | 1630 |
| parasiteOf | 1580 |
| hasParasite | 1390 |
| adjacentTo | 778 |
| pollinates | 493 |
| pollinatedBy | 493 | 

Zero edges (honest empty state): 9/221 — Mauremys japonica, Euhadra amaliae, Euhadra eoa, Biwia yodoensis, Cicindela japonica, Macrostemum radiatum, Neohirasea japonica, Calopteryx cornelia, Ceriagrion nipponicum 

Zero-edge share per tile: 🐦 0/39 · 🦌 0/4 · 🦎 1/8 · ❔ 3/34 · 🦋 5/60 · 🌿 0/60 · 🐸 0/8 · 🍄 0/8 

Most connected:

| Art | edges |
| --- | --- |
| Ardea cinerea | 1000 |
| Passer montanus | 1000 |
| Milvus migrans | 1000 |
| Anas platyrhynchos | 1000 |
| Columba livia | 1000 |
| Corvus corone | 1000 |
| Phalacrocorax carbo | 1000 |
| Motacilla alba | 1000 |
| Hirundo rustica | 1000 |
| Aegithalos caudatus | 1000 | 

## E10 · look-alikes = same genus in the GBIF backbone
 

218/221 species have ≥1 sibling. Spot checks:

| Art | siblings (global) | examples |
| --- | --- | --- |
| Turdus pallidus | 50 | Turdus spec, Turdus gigantodes, Turdus pectoralis, Turdus leucopygus |
| Armadillidium vulgare | 50 | Armadillidium maculatum, Armadillidium baldense, Armadillidium marmorivagum, Armadillidium kochi |
| Procambarus clarkii | 50 | Procambarus ancylus, Procambarus natchitochae, Procambarus hinei, Procambarus verrucosus |
| Leucauge celebesiana | 50 | Leucauge regnyi, Leucauge mahurica, Leucauge mendanai, Leucauge arbitrariana |
| Cicindela japonica | 50 | Cicindela sepulchralis, Cicindela pullata, Cicindela viridis, Cicindela crucifera |
| Camponotus japonicus | 50 | Camponotus akwapimensis, Camponotus zulu, Camponotus exasperatus, Camponotus prismaticus |
| Promachus yesonicus | 50 | Promachus tewfiki, Promachus leontochlaenus, Promachus bifasciatus, Promachus brevipennis |
| Lycaena phlaeas | 50 | Lycaena fm, Lycaena dimorpha, Lycaena lampertii, Lycaena romana |
| Ourapteryx nivea | 50 | Ourapteryx subcurvaria, Ourapteryx sulphurea, Ourapteryx nonmarginata, Ourapteryx inouei |
| Protaetia orientalis | 50 | Protaetia hungarica, Protaetia laotica, Protaetia ungarica, Protaetia ishigakia |
| Begonia grandis | 50 | Begonia alemedana, Begonia bismarcki, Begonia costello, Begonia landsbergiae |
| Cinnamomum camphora | 50 | Cinnamomum wrightii, Cinnamomum corneri, Cinnamomum vacciniifolium, Cinnamomum borneense | 

Note: siblings are global, not regional. Regional look-alikes = siblings ∩ the plausible set, which the ETL can compute for free. 

requests: {"api.globalbioticinteractions.org":94,"api.gbif.org":37} 

EXIT 0
