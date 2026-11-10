# Infernal Warriors — source-profile audit, first pass (Alpha 0.5.1)

Source: the public `Infernal_Warriors.cat` from [Gaul-Campaign-Renegades](https://github.com/Varroth/Gaul-Campaign-Renegades), revision 24 (November 10, 2026). Its live blob SHA is checked during each browser sync. The simulator never writes back to the source repository.

## Confirmed source findings

The catalogue has **74 root unit entries**. Many infantry units store their model-count and points cost inside the required *formation upgrade*, not in the unit's root `costs`. The initial simulator importer treated these as unknown and guessed values. This has been corrected for the default branch.

| Datasheet | Default formation | Points for default formation |
| --- | ---: | ---: |
| Infernal Berzerkers | 5 models | 115 pts |
| Despoiler Cadre | 5 models | 100 pts |
| Void Breachers | 5 models | 115 pts |
| Bloodmarked Thralls | 10 models | 45 pts |
| Chainbound Reavers | 5 models | 55 pts |

Additional catalogues have varying organization structures and have not completed this first-pass audit.

## Implemented corrections

- Read the entry selected by New Recruit's `defaultSelectionEntryId` under `Required unit size and formation`; calculate starting models and points from that entry.
- Record the other declared formation sizes and prices for review (not yet selectable in battle).
- Traverse the *selected* nested wargear menus; resolve default weapon `infoLink` references against the shared weapon profile definitions.
- Count per-model weapons, including groups such as nine regular Thralls plus one specialist, instead of applying the strongest representative weapon to every model.
- Resolve the chosen weapon profile's attacks, range, strength, penetration and damage; use distinct default ranged/melee weapons in attacks.
- Correct special composition cases such as the Lost Cohort’s five afflicted (with Chaplain cost bundled), two Attack Bikes and ten Bloodletters. Exclude Khorne Daemon allies from Infernal Serum.
- Keep the **Synced** label unless full unit, weapon-option, special-rule, attachment, points modifier and engine validation requirements have been met.

## Still required before any Verified badge

The current engine does not yet reproduce every optional wargear selection, automatic paid point modifier, leader attachment, detachment, psychic/daemon interaction, weapon trait or casualty-by-model choice. **No individual unit is marked fully Verified in this pass.** The audit script prints a source-coverage report for all 74 current root units in the GitHub Actions job logs. Unit records whose root formations cannot be interpreted remain labeled Synced and may still contain estimates.

The next audit stage is model-by-model loadout selection and composition enforcement, followed by special ability integration and reproducible per-unit rule tests. Only then should review-ledger entries be signed off.
