# Gaul Campaign Simulator — Alpha 0.5 (Infernal Warriors source-profile audit)

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

This is a tactical simulation, **not** a faithful renderer of every New Recruit selection graph or Warhammer tabletop rule. The importer now reads the catalogue’s **default required formation** (squad size and listed base points), resolves linked default weapon profiles and uses mixed-weapon attack counts. Other formation choices and equipment menus are shown for review, but are not yet freely selectable within a single simulated roster. Complex model-specific wound allocation, weapon traits, paid modifiers, detachments, stratagems, Leader attachments and faction mechanics remain simplified. If a source cost cannot be resolved, it is flagged **Est. points**; this is not the same as the Sim Estimate profile status. Do **not** use these profiles or Battle Lab results as validated army-list prices or competitive balance claims.

**Silver Tempests:** The source `Silver_Tempest.cat` currently has *zero* published root units. Its eight existing simulator playtest units remain selectable until that catalogue is populated.

## Run locally

Open `index.html` in a modern browser. Internet access is needed for the source sync; the original playtest units work offline. A local HTTP server can also be used (`python -m http.server`). Save and load work in the current browser, and game JSON may be exported/imported.

## Test

`node --test tests/*.test.cjs`

GitHub Actions also downloads the public New Recruit source repository **read-only**, audits the XML root unit layout and checks five known Infernal Warriors formation configurations. Local real-browser parser tests are available in `tests/browser-parser-smoke.py` (requires Playwright). There are no third-party JavaScript libraries or browser tracking services.

## Roadmap

- [x] Live catalogue discovery and cache keyed to the source repository's file checksums.
- [x] Searchable Army Builder and on-demand refresh.
- [x] Infernal Warriors default formation sizes, published starting points and linked default weapon profiles (initial audit).
- [ ] Exact loadout alternatives, model-by-model wound allocation, weapon traits and modifier-based points for all units.
- [ ] Formal Leader attachments and cross-faction allied force rules.
- [ ] Terrain, line of sight, psychic mastery, engine containment and full faction abilities.
- [ ] Multiplayer and narrative campaign persistence.

Gaul Campaign Simulator is an independent non-commercial fan project, **not affiliated with or endorsed by Games Workshop**.
