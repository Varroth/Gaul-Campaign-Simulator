# Infernal Warriors — Configurable Musters (Alpha 0.6)

This is **not** an exact BattleScribe/New Recruit selection graph renderer or a fully verified Warhammer rules implementation. It is an incremental improvement to the Gaul Campaign tactical simulator, with an auditable source revision and explicit simplifying assumptions.

## Supported

- **Formation selections:** Every Infernal Warriors entry with a recognizable `Required unit size and formation` menu can select the published quantity and formation price (including 5/10 choices where present). Choices are loaded live from `Infernal_Warriors.cat`, not hardcoded into the game.
- **Per-model default weapons and alternatives:** The simulator displays editable weapon menus where every option is a simple, direct weapon-profile assignment with no nested dependencies. It calculates the resulting mixed-weapon profile and sums any declared points differences.
- **Leaders:** New Recruit `type="model"` characters with a `Leader eligibility / attachments` profile are imported as characters. A squad can select one matching Leader from those explicitly declared eligible by the catalogue; an attached Leader is charged **once** and fights from the same battlefield tile, using its own weapon profile. Bodyguards absorb damage first; the Leader survives after the last bodyguard and uses its own wounds, Toughness, Save and OC in simplified form.
- **Lost Cohort:** A formation whose printed price includes its compulsory Chaplain does **not** allow a second Leader through this menu. Chaplain supervision, berserk checks and special control mechanics are not yet simulated.
- **Saves and exports:** Custom selections are recorded as stable source-based IDs and concise selection specifications. Import requires the same source catalogue revision; otherwise the player must reconfigure their roster to avoid silently incorrect loadouts.
- **Safety:** Unsupported models and menus remain on the source defaults. Invalid options are rejected; sources are read-only.

## Still provisional / NOT Verified

- Weapon traits (Torrent, Heavy, Sustained Hits, rerolls), alternate fire modes, complex conditional cost modifiers, roster-wide maximum selections, upgrades, and cross-slot/per-five special-weapon quotas are *not* all enforced. **Always validate legality and exact points in New Recruit before relying on a simulated roster.**
- Equipment menus with nested option dependency trees are not yet editable here.
- Attached Leaders are approximated as a model in the bodyguard unit rather than complete Warhammer attachment/wound rules; buffs, precision hits, bodyguard/Leader detachment on death, command abilities, enhancement effects, and multiple independent OC traits are incomplete.
- Data imports and selected variations remain **Synced** until the combat effects and complete rule constraints are manually audited and revision-pinned.
- Other factions' detailed formation menus are outside this Alpha 0.6 pass.

## Regression checks

Run `node --test tests/*.test.cjs` (75 tests) and, with Playwright/Chromium installed, `python tests/browser-config-smoke.py` and `python tests/browser-parser-smoke.py`. Browser tests include a full 5-to-10 model edit, a mixed bolt/plasma weapon swap, an eligible attached Chaplain, attack-count recalculation and save/load roundtrip.
