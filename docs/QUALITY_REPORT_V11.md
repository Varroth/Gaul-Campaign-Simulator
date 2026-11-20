# Alpha 0.11.1 — quality report

This release extends Infernal Warriors army configuration and combat rules. It remains an abstract training simulator, **not complete tabletop rules parity**. No unit is marked Verified.

## Source and scope

Source: read-only `Varroth/Gaul-Campaign-Renegades` commit `3a37816f85925b6868d673f1f491fa4962efeb04`. The source repository has not been modified. Profile counts are IW 96 (74 units and 22 characters), FC 169, AD 61, ST 27: **353 total**. Silver Tempests revision 13, blob `2e1223f5c6b7bb94bb75dd9dece89bf666137246`, now supplies published units in place of the earlier eight local estimates. Full hashes and revisions are recorded in the CI artifact and [previous source table](QUALITY_REPORT_V10.md#source-snapshot).

## Implemented in this release

The live publication check caught a new-source import issue: Tide Lieutenant, Oathkeeper, Apothecary and Forgewarden had abbreviated `char` categories and were inferred as five models. Alpha 0.11.1 reads root Keywords profiles, imports these as single characters at their published cost, preserves explicitly declared multi-model formations, and invalidates the old catalogue cache. Regression and browser checks now cover these four profiles.

| Area | Behavior and limits |
| --- | --- |
| Detachment selection | All four, source costs 1/1/1/2 DP, unique selections, 2 DP at 1,000 points or 3 at 2,000. Other sizes cannot silently reuse these budgets. |
| Paid enhancements | All sixteen, using actual source recipient links; one per unit and one separate eligible generic Chaplain choice. Named Heroes cannot buy Character Enhancements. Exact extra cost, at most 2/4 distinct names and source copy caps. Removing an unlocking detachment blocks deployment until its upgrades are removed. |
| Dismantler’s Charge | A selected model's one melee weapon gains Strength; only one weapon copy is changed. Which model survives still follows the engine's proportional casualty approximation. |
| Other upgrade effects | Advance bonus, full charge re-roll, finite saving-throw/damage protection, Battle-shock support, bounded Hit/Wound re-rolls, repair bonus without stacking, Vox range and immediate Field Manual retargeting. Attached bearer effects end on bearer death. |
| Breach and Ruin / Crimson Onslaught | One charge Wound re-roll per army turn against an objective/covered enemy; first eligible successful charger receives one melee Hit re-roll. Transport discounts/insertion subrules remain excluded. |
| War Hounds’ Legacy / Iron Reavers | Both units declare a legal common target at phase start and then resolve attacks together. Network grants separately chosen Hit/Wound re-rolls; Iron and Ash grants one selected recipient a Hit re-roll. Range, officer/bearer life, units on field and prior attacks are checked. Combining simultaneous doctrine declarations still needs fuller timing support. |
| Active stratagems | Sixteen supported actions with CP cost, selected detachment, eligibility, phase, range/target and use checks. Effects affect one attack/weapon/roll where the source says one. |
| Defensive reactions | Seven optional automatic orders: Shield Wall, Cataphractii Resolve, Pain as Purpose, Armoured Curtain, Containment Protocol, The Old Oath, Brotherhood of Iron. CP is spent at the actual eligible trigger. Free re-rolls cannot be re-rolled again. |
| CP scenario settings | Explicit starting CP and CP per own turn, default zero; turn-one income is included. Both sides use the same settings. Each named stratagem is limited to once per phase in this training engine. These are configurable scenario assumptions, not an invented official mission pack. |
| Machine-Ready | Removes one selected negative Move-characteristic modifier while retaining others and immobility. It does not remove terrain/mission prohibitions. No unsupported source penalty is invented to create an opportunity. |
| Saves and automated play | Preserve detachment selection, paid choices, CP and effect uses. Existing unenhanced formation IDs remain compatible. Joint attacks and active stratagems run in Battle Lab; reaction spending requires the same opt-in setting. |
| Quality corrections | Unit type checks recognize source VEHICLE keywords; daemon allies use the agreed points limit; automatic battles do not process the same turn start twice. Crossing Fires expires on the next single attack even on a miss. Hammer the Breach changes one weapon copy. |

## Checks and evidence

All **260 automated regression tests** pass, covering prior functionality plus the new army rules. CI also runs six source XML audits and four Chromium browser scripts. The catalogue execution audit checks:

- 353 imported profiles and 706 ranged/melee execution states;
- 284 formations and 2,991 individual reachable equipment choices, not every combination;
- all sixteen upgrade names across 119 eligible recipient/upgrade mappings, with exact extra points;
- named-Hero rejection and a separately paid attached generic Chaplain upgrade;
- cache integrity below the standard 5 MiB browser quota;
- reserve transport manifests, saves and complete simulated battles.

Browser checks use unchanged application scripts and pinned real catalogue XML. They exercise detachment selection, a paid Crimson Spur on Assault Jump Cadre, Redline Advance CP spending, combined Advance bonuses, save/load, transport arrivals, import/export, complete battle, repeated seeded Battle Lab, offline cache and 390px layout. The deployed site is inspected separately after publication.

The `simulator-quality-report` CI artifact includes `catalogue-qc.json`, `browser-qc.json`, parsed source profiles, the ability coverage report, per-unit unresolved-rule audit and desktop/mobile screenshots, including `army-configuration.png`.

## Remaining work and source blockers

| Area | Remaining limitation |
| --- | --- |
| Mission pack | The catalogue refers to an unspecified agreed 11th-edition mission pack. Reserve caps, first-turn exceptions, deployment, scoring, official CP income and the full core timing system require that document. Current games use the documented training scenario. |
| No Quarter Asked | Uses “nearby” without a distance. The other 23 stratagems have handlers; this one stays unavailable rather than assigning an invented range. |
| Other named abilities | Eighteen source ability descriptors remain reference-only. Some have undefined ranges or terms, and some need additional deployment/consolidation/reaction mechanics. Passing software tests does not complete them. |
| Full roster constraints | Conditional modifiers, multiple-selection menus, every per-five/model-level quota, and cross-faction attachments still need a complete New Recruit constraint evaluator. |
| Transport subrules | Breach and Ruin requisition discounts, insertion exceptions and mission-dependent pregame repositioning need further source-rule implementation. |
| Exact battle fidelity | Individual models/bases, true visibility, aircraft flight, mixed-weapon casualties, every mortal-wound interaction and simultaneous effect ordering remain approximations. Army doctrines/upgrades/stratagems are therefore partial rule coverage. |
| Other factions | Import and combat execution are tested, but full FC/AD/ST rules are not implemented. Silver Tempests now imports all 27 published revision-13 profiles; its complete faction mechanics still need implementation. |

This is a tested development release. The full original rules checklist is **not yet complete**. Source gaps and remaining implementation are listed separately above so neither is mistaken for verified behavior.
