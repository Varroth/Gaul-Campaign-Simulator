# Gaul Campaign Simulator — Alpha 0.3 (Live New Recruit Bridge)

An **unofficial browser-based tactical playtest** for Gaul Campaign: Renegades. The simulator is developed independently of [the source New Recruit army catalogues](https://github.com/Varroth/Gaul-Campaign-Renegades).

## Play

Once GitHub Pages is enabled, the game is at **https://varroth.github.io/Gaul-Campaign-Simulator/**. Open **Army Builder** to search units or filter by faction. Click **Sync latest units** at any time; the page also checks the source repository on load and periodically when an inactive tab is revisited.

No user login or GitHub token is needed. The browser fetches public catalogue `.cat` XML files read-only and uses the GitHub tree's file checksums to avoid redundant downloads. Basic catalogue entries are cached on your device. If GitHub is unavailable, cached data (if present) or the built-in illustrative units remain available.

## What syncs automatically

- Published selectable **unit names, catalogue revisions, basic unit characteristics** and easily interpretable base points from New Recruit.
- Available units change on the next source check after a catalogue file changes, without manually copying the whole list between repositories.
- The source repository does **not** need any automation, deploy key, workflow or special permissions for this to work.

## What is *not* fully imported yet

This is a tactical simulation, **not** a faithful renderer of every New Recruit selection graph or Warhammer tabletop rule. Complex unit composition, weapon menus, model-specific profiles, point modifiers, detachment rules, stratagems, leader attachments and detailed faction mechanics are not automatically translated. If a base cost cannot be read safely, the UI marks it as **SIM ESTIMATE**. Ranged/melee weapons shown in the inspector are representative and may use simplified placeholders. Do **not** use these profiles or Battle Lab results as validated army-list prices or competitive balance claims.

**Silver Tempests:** The source `Silver_Tempest.cat` currently has *zero* published root units. Its eight existing simulator playtest units remain selectable until that catalogue is populated.

## Run locally

Open `index.html` in a modern browser. Internet access is needed for the source sync; the original playtest units work offline. A local HTTP server can also be used (`python -m http.server`). Save and load work in the current browser, and game JSON may be exported/imported.

## Test

`node --test tests/*.test.cjs`

GitHub Actions also downloads the public New Recruit source repository **read-only** and audits the XML root unit layout against its published manifest. There are no third-party JavaScript libraries or browser tracking services.

## Roadmap

- [x] Live catalogue discovery and cache keyed to the source repository's file checksums.
- [x] Searchable Army Builder and on-demand refresh.
- [ ] Detailed profile/wargear/points translation with correct New Recruit modifier rules.
- [ ] Formal Leader attachments and cross-faction allied force rules.
- [ ] Terrain, line of sight, psychic mastery, engine containment and full faction abilities.
- [ ] Multiplayer and narrative campaign persistence.

Gaul Campaign Simulator is an independent non-commercial fan project, **not affiliated with or endorsed by Games Workshop**.
