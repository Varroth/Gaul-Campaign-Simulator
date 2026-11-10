# Combat-profile verification policy (Alpha 0.4)

This policy deliberately keeps importing a unit separate from certifying that the simulator reproduces it faithfully. **An imported unit is not Verified merely because the XML contains a points cost or a weapon profile.**

## Levels

- **Sim Estimate:** Simulator-only fallback; not linked to the New Recruit catalogue (including Silver Tempests while their source catalogue is empty).
- **Synced:** Live XML unit imported; the name and some datasheet fields are sourced, but the simulator's tactical abstractions, equipment choices and faction rules are not fully audited. The profile may also have independent **Est. points** (generated) or **Calc. points** (extrapolated) warnings.
- **Verified:** A deliberately reviewed mapping is registered in the source-controlled `VERIFIED_LEDGER` in `catalogue.js`. The entry must record its exact New Recruit source ID and catalogue Git blob SHA, matching combat-profile fingerprint, engine ruleset version, reviewer, review date and positive checks for every category below. This badge is never awarded through automation alone, local browser cache, or client-input metadata.

## All required checks before adding to the ledger

1. **Stats:** Characteristic sources and conversions (including grid movement and wound allocation) compared against the actual selected models.
2. **Points:** Costs at the chosen roster size confirmed, including modifiers, default equipment and upgrades, not merely guessed from one XML value.
3. **Weapons:** All available weapons, legal loadouts, attack multipliers, ranges and damage rules mapped accurately.
4. **Abilities:** Special rules, Leader attachments, detachments, faction mechanics, aura timing, psychic interactions and relevant exceptions modeled and tested.
5. **Composition:** Legal squad/model quantities and roster restrictions, even if the simulator enforces more conservative limitations.
6. **Engine:** Combat execution and AI test cases cover the rule interactions using deterministic reproducible examples.

The first release has **zero fully Verified units**. This is intentional: the Alpha 0.4 engine still uses one representative ranged/melee weapon per unit and does not simulate every wargear option, attachment or faction rule. Until a complete unit mapping and the associated regression tests exist, a Sync badge is the accurate label.

A reviewer must add a new ledger entry after the full checks and tests. Source changes or engine-version changes automatically downgrade the badge to **Synced** until a repeat review. Existing simulator profiles are not modified by this policy.
