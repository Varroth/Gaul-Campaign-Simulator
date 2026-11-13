# Alpha 0.10 — quality report

This report covers software behavior and source import integrity. It does **not** certify full tabletop rules fidelity. No unit has been promoted to Verified.

## Source snapshot

Read-only source repository commit: `22d3ef1d06ca755118e75e0fc02648fca6b1c183`.

| Catalogue | Revision | Imported profiles | Git blob SHA |
| --- | --- | ---: | --- |
| Infernal Warriors | 24 | 96: 74 units + 22 characters | `e175fdcc40c5399af4e0b807a8d4f3f63ba291fe` |
| Frozen Cogs | 30 | 169 | `940b6131551c576b926c95a4b2f7cbd5db2278e0` |
| Abandoned Dead | 25 | 61 | `83e0b8ab5a507799456dda46174e94d91bc1df59` |
| Silver Tempests | 12 | 0 | `4f9cabf91508368df7bdb79d3cd8bed39b405d85` |

The source catalogue repository is unchanged. CI records the checksums of the source it actually audits, so later runs may legitimately have different counts.

## Implementation and checks

| Area | Implementation | Verification |
| --- | --- | --- |
| Unit discovery | All published playable root profiles; eight Silver Tempests estimates retained | 326 registered profiles; no duplicate IDs |
| Infernal configuration | Active nested branches, optional None choices, formations, eligible Leaders, vehicle and character menus | 284 formation configurations and 2,991 reachable equipment choice attempts; audited quotas reject prohibited combinations |
| Combat execution | Every imported profile evaluated in ranged and melee states | 652 profile/mode checks; finite results and wound bounds |
| Transport plans | Twelve capacities, armour exclusions and multipliers, one external Stormraven Dreadnought | Combined cargo checks, illegal nested carriers rejected |
| Reserves | Paid units, Deep Strike, Reinforcements step, arriving carriers with passengers | Timing, distance, disembarkation, saved manifests and a complete automated battle |
| Carrier effects | Land Raider Assault Ramp; selected Rhino, Razorback and Kharybdis benefits; emergency disembarkation | Movement, Advance, charge and wounds tests |
| Combat corrections | Multiple vehicle weapons, full large-vehicle wounds, alternative firing profiles, shared targeting, corrected charge distance | Regression cases and source assertions |
| Source abilities | Selected healing, stabilization, Battle-shock, support and reroll actions; active attached-Leader abilities | Timing, distance, target, use limits and persistence checks; incomplete contexts remain Partial |
| Data and saves | Compressed cache, verified source checksums, offboard units, identity validation and battle profile snapshots | Cache roundtrip below 5 MiB; source revision rejection; saved battle validation |
| Browser | Actual XML and unchanged application scripts in Chromium | Desktop/mobile, vehicle options, two squads arriving by Deep Strike, save/load, export/import, complete battle, seeded Battle Lab, offline cache |

The equipment count is **individual reachable choice attempts**, not every combination of options. A successfully imported branch does not prove all its New Recruit conditions. Combat execution checks do not certify every named rule. Browser source responses use pinned XML for reproducibility; a deployed-site inspection separately checks hosting.

## Capacity mappings

| Transport | Capacity | Eligibility and effects |
| --- | ---: | --- |
| Rhino Carrier | 10 | No Terminators or Jump Packs |
| Razorback Fire-support Carrier | 6 | No Terminators, Jump Packs or Gravis |
| Land Raider | 12 | Terminators use two spaces; Assault Ramp |
| Spartan | 20 | Terminators use two spaces |
| Mastodon | 30 | Terminators use two spaces |
| Dreadclaw | 10 | Terminators use two spaces; landing transport |
| Kharybdis | 20 | Terminators use two spaces; landing transport |
| Terrax | 10 | No Terminators |
| Storm Eagle | 20 | Terminators use two spaces |
| Stormbird | 40 | Terminators use two spaces |
| Stormraven | 12 | Terminators and Jump Packs use two spaces; one additional eligible external Dreadnought |
| Thunderhawk | 30 | Terminators use two spaces |

Capacities do not imply exact aircraft flight, firing decks, hull geometry or full transport rules. Normal transport eligibility still excludes non-infantry, daemon and vehicle passengers except the specific Stormraven Dreadnought allowance.

## Remaining work for full rules sign-off

| Area | What is still required |
| --- | --- |
| Mission and reserves | The source refers to an **agreed 11th-edition mission pack** without identifying it. Exact reserve limits, first-turn exceptions, deployment and scoring require that document. The training scenario uses round-two arrivals, friendly-edge reserves or Deep Strike, and over-9-inch enemy separation. |
| Detachments and stratagems | Detachment Point selection, CP economy, stratagem timing, enhancements and stacking/eligibility need engine implementation and individual tests. They are not silently applied. |
| All named abilities | Remaining reference-only effects need handlers and tests. Some descriptions use **nearby** without a range; assigning one would invent rules. |
| Full New Recruit graph | Conditional modifiers, multiple-selection groups, every per-five quota, model-level gear and all cross-faction attachments require a complete constraint evaluator. Omitted groups remain audit blockers. |
| Exact geometry | Individual model positions, bases/hulls, true visibility and aircraft minimum movement/turns remain abstracted into two-inch grid cells. |
| Exact allocation | Mixed-weapon casualties remain proportional; per-model main melee weapon choices and every mortal-wound interaction are not fully reproduced. |
| Other factions | Imported profiles execute, but complete faction mechanics are not implemented. Silver Tempests cannot sync absent source units. |

The source is insufficient for the missing mission pack and undefined ranges. The other rows are remaining development work, not source blockers. Passing this release's checks does not mark them complete.

## Reproducible evidence

Run the [README commands](../README.md), or open [Simulator Regression Tests](https://github.com/Varroth/Gaul-Campaign-Simulator/actions/workflows/simulator-tests.yml). Each run uploads `simulator-quality-report` with:

- `catalogue-qc.json`: imported units, formation/choice counts, source SHAs, cache size and failures.
- Individual Infernal unit/character audits with unresolved rules per source entry.
- `browser-qc.json`: browser version, tested flows, source download count and JavaScript errors.
- Desktop/mobile screenshots and the exported test battle.

Historical alpha notes remain available; this report and the current code describe release 0.10.
