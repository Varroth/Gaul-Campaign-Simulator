# Gaul Campaign Simulator — Alpha 0.7 (Infernal Warriors roster rules and weapon effects)

An **unofficial browser-based tactical playtest** for Gaul Campaign: Renegades. The simulator is developed independently of [the source New Recruit army catalogues](https://github.com/Varroth/Gaul-Campaign-Renegades).

## Play

Once GitHub Pages is enabled, the game is at **https://varroth.github.io/Gaul-Campaign-Simulator/**. Open **Army Builder** to search units or filter by faction. Click **Sync latest units** at any time; the page also checks the source repository on load and periodically when an inactive tab is revisited.

No user login or GitHub token is needed. The browser fetches public catalogue `.cat` XML files read-only and uses the GitHub tree's file checksums to avoid redundant downloads. Basic catalogue entries are cached on your device. If GitHub is unavailable, cached data (if present) or the built-in illustrative units remain available.

## Confidence labels

- **Verified:** Source entry and the simulator combat mapping have been manually reviewed, with all required checks, a source Git blob SHA and a profile fingerprint pinned in the verification ledger. Automatically becomes **Synced** if the source revision changes. This initial release intentionally awards no Verified badges until complete reviews are performed.
- **Synced:** A unit imported from the New Recruit repository. Its name and some fields come from the XML, while advanced weapon traits, optional loadouts, roster modifiers and abilities may still use simplified rules.
- **Sim Estimate:** A manually maintained simulator-only profile, not a linked New Recruit unit.
- **Est. points:** The imported XML did not contain an interpretable base cost, so the simulator generated one. **Calc. points:** A cost was extrapolated from model entries; roster modifiers may change it. Both warnings are independent of verification level.

Use the **Profile status** filter and expand **Verification details** on each unit to see why it is not yet Verified. See [verification policy](docs/VERIFICATION_POLICY.md).

## What syncs automatically

- Published selectable **unit names, catalogue revisions, basic unit characteristics** and easily interpretable base points from New Recruit.
- Available units change on the next source check after a catalogue file changes, without manually copying the whole list between repositories.
- The source repository does **not** need any automation, deploy key, workflow or special permissions for this to work.

## What is *not* fully imported yet

This is a tactical simulation, **not** a faithful renderer of every New Recruit selection graph or Warhammer tabletop rule. The importer reads published formation size/points alternatives, resolves linked default and selected weapon options, and uses mixed-weapon attack counts. Infernal Warriors may choose published squad-size formations, supported flat per-model weapon menus, and eligible source-declared Leaders inside the Army Builder. The game now enforces source-declared per-datasheet roster caps (including a shared maximum of two Lost Cohort squads), unique named Leaders across attached and independent selections, and two explicitly source-audited per-five weapon quotas. Weapon traits Torrent, Rapid Fire, Heavy, Twin-linked, Sustained Hits, Lethal Hits, Ignores Cover, Melta, Blast, Pistol and Devastating Wounds have simplified mechanical implementations. Warp-Aggravated Pain has its ordinary D6 Command-phase test near hostile Psykers/Daemons. Complex nested menus, advanced weapon traits, conditional paid modifiers, full Lost Cohort control, exact Leader abilities, detachment costs and model-by-model rules remain provisional. If a source cost cannot be resolved, it is flagged **Est. points**; this is not the same as the Sim Estimate profile status. Do **not** use these profiles or Battle Lab results as validated army-list prices or competitive balance claims.

**Silver Tempests:** The source `Silver_Tempest.cat` currently has *zero* published root units. Its eight existing simulator playtest units remain selectable until that catalogue is populated.

## Run locally

Open `index.html` in a modern browser. Internet access is needed for the source sync; the original playtest units work offline. A local HTTP server can also be used (`python -m http.server`). Save and load work in the current browser, and game JSON may be exported/imported.

## Test

`node --test tests/*.test.cjs`

GitHub Actions also downloads the public New Recruit source repository **read-only**, audits the XML root unit layout and checks five known Infernal Warriors formation configurations. Local real-browser parser tests are available in `tests/browser-parser-smoke.py` (requires Playwright). There are no third-party JavaScript libraries or browser tracking services.

## Roadmap

- [x] Live catalogue discovery and cache keyed to the source repository's file checksums.
- [x] Searchable Army Builder and on-demand refresh.
- [x] Infernal Warriors default formation sizes, published starting points and linked default weapon profiles and source-expressed special compositions (initial audit).
- [x] Infernal Warriors selectable formations, supported flat weapon options and eligible attached Leaders with saved configurations (alpha 0.6).
- [x] Source-declared unit caps, a shared Lost Cohort cap, named Leader uniqueness and two source-audited per-five weapon quotas (alpha 0.7).
- [x] Partial weapon trait resolution and ordinary Warp-Aggravated Pain D6 check (alpha 0.7).
- [ ] Full nested equipment rules, exact model-by-model wound allocation, remaining weapon traits, all per-five quotas and modifier-based points for all units.
- [ ] Exact Leader attachment effects and full cross-faction allied force rules.
- [ ] Terrain, line of sight, psychic mastery, engine containment and full faction abilities.
- [ ] Multiplayer and narrative campaign persistence.

Gaul Campaign Simulator is an independent non-commercial fan project, **not affiliated with or endorsed by Games Workshop**.

## Alpha 0.6 notes

See [Configurable Musters](docs/CONFIGURABLE_MUSTERS.md) for details of the editable squad-size, per-model wargear and Leader options, save-file source pinning, and the limitations that prevent a **Verified** combat badge. The original Gaul Campaign: Renegades catalogues remain untouched.

## Alpha 0.7 audit scope

See [Source roster rules and combat effects](docs/ROSTER_RULES_V7.md). **0 units are marked Verified**: the added checks address some of the biggest fidelity gaps, but full source-to-engine mapping still requires unit-specific review. GitHub Actions checks current source restrictions through `scripts/audit_roster_rules.py`.
