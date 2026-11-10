# Gaul Campaign: Renegades — Battle Simulator (Alpha 0.2)

An **unofficial, self-contained browser-based tactical playtest** in a dedicated GitHub repository. The New Recruit army catalogues remain independent in [Gaul-Campaign-Renegades](https://github.com/Varroth/Gaul-Campaign-Renegades).

## Play online

After GitHub Pages is enabled at **Settings → Pages → Deploy from a branch → `main` → `/(root)`**, the expected play URL is [https://varroth.github.io/Gaul-Campaign-Simulator/](https://varroth.github.io/Gaul-Campaign-Simulator/). Publication must be verified after enabling Pages.

## Launch

1. Open `index.html` in a modern browser. No installation, account, internet connection or build step required.
2. Choose a friendly unit, then an accessible tile in **Movement** phase. Advance through **Shooting → Charge → Fight**, selecting a friendly unit and clicking a valid opposing target.
3. Finish the turn and let the AI play. Scoring begins in round 2; the battle ends after round 5 or force elimination.
4. **Army Builder** changes each side's force; **Battle Lab** runs ten deterministic AI-vs-AI trials.
5. **Save/Load** uses the current browser's localStorage. **Export/Import JSON** allows manual backups or transferring a battle to another browser.

## Tech

- `index.html` — interface; `styles.css` — responsive layout and battlefield; `app.js` — DOM interaction; `engine.js` — deterministic pure-JavaScript combat and AI engine.
- `tests/` — Node built-in tests for engine + interface. Run `node --test tests/*.test.cjs` from repository root.
- No libraries, trackers, calls to external APIs, or third-party assets.

## Alpha limitations

34 **illustrative** unit templates span Infernal Warriors, Frozen Cogs, Abandoned Dead and Silver Tempests. Point values and weapon data are **simulator-only provisional estimates** and must not be mistaken for authoritative New Recruit army-list values. The initial armies use approximately 1,000 simulator points each.

This is a simplified square-grid tactical abstraction, not a model-by-model reconstruction of any official edition. It implements movement obstacles, D6 hit/wound/save/damage, 5+ Feel No Pain, recovery, cover, basic factions effects, charge, fights, objectives, AI and batch simulation. Full line of sight, faction detachments, weapon options, command points, native roster import, exact squad/Leader attachment limits and Silver Tempests full psychic rules remain on the backlog.

Do not present generated battle-lab outcomes as measured real-life game balance or approved points values.

## Proposed roadmap

- [ ] Import New Recruit roster exports and map actual catalogue rules to reviewed simulation profiles.
- [ ] Full battle phases, line of sight, engagement, terrain types, objectives and missions.
- [ ] Leader attachments, Lost Cohort supervision, Frozen Cogs engine protocols, Directorate Nullifier aura, Stormseer psychic hierarchy.
- [ ] Compare AI strategy results to scripted deterministic scenarios; measure balance and publish known limitations.
- [ ] GitHub Pages deployment verification, mobile UI QA and broader accessibility testing.

This is a fan-made homebrew project and not affiliated with Games Workshop.