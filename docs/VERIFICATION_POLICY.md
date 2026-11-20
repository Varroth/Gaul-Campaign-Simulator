# Combat-profile verification policy

This policy deliberately keeps importing a unit separate from certifying that the simulator reproduces it faithfully. **An imported unit is not Verified merely because the XML contains a points cost or a weapon profile.**

## Levels

- **Sim Estimate:** Simulator-only fallback, independent of the New Recruit catalogue. These entries are hidden from a faction’s catalogue when published source units are available, but existing starter armies and saved battles can still contain them.
- **Synced:** Live XML unit imported; the name and some datasheet fields are sourced, but the simulator's tactical abstractions, equipment choices and faction rules are not fully audited. The profile may also have independent **Est. points** (generated) or **Calc. points** (extrapolated) warnings.
- **Verified:** A deliberately reviewed mapping is registered in the source-controlled `VERIFIED_LEDGER` in `catalogue.js`. The entry must record its exact New Recruit source ID and catalogue Git blob SHA, matching combat-profile fingerprint, engine ruleset version, reviewer, review date and positive checks for every category below. This badge is never awarded through automation alone, local browser cache, or client-input metadata.

## All required checks before adding to the ledger

1. **Stats:** Characteristic sources and conversions (including grid movement and wound allocation) compared against the actual selected models.
2. **Points:** Costs at the chosen roster size confirmed, including modifiers, default equipment and upgrades, not merely guessed from one XML value.
3. **Weapons:** All available weapons, legal loadouts, attack multipliers, ranges and damage rules mapped accurately.
4. **Abilities:** Special rules, Leader attachments, detachments, faction mechanics, aura timing, psychic interactions and relevant exceptions modeled and tested.
5. **Composition:** Legal squad/model quantities and roster restrictions, even if the simulator enforces more conservative limitations.
6. **Engine:** Combat execution and AI test cases cover the rule interactions using deterministic reproducible examples.

The current release has **zero fully Verified units**. Source-linked formations, weapon menus, attachments and army rules have tested implementations, but model geometry, conditional roster constraints and full faction timing remain incomplete. Until a complete unit mapping meets every category above, a Synced badge is the accurate label.

A reviewer must add a new ledger entry after the full checks and tests. Source changes or engine-version changes automatically downgrade the badge to **Synced** until a repeat review. Existing simulator profiles are not modified by this policy.


## Current implementation coverage

Source-declared root selection limits, named character uniqueness, a shared Lost Cohort cap, selected per-five wargear quotas, and supported weapon traits are implemented with tests. Infernal Warriors also have paid upgrades, four core detachment doctrines and 23 stratagem handlers with documented timing and geometry limits. This **does not** meet the complete verification criteria: conditional modifier trees, every interaction, exact casualty allocation and full mission/faction rules remain incomplete. No profile currently meets all criteria. See [the current quality report](QUALITY_REPORT_V11.md) for the executed checks and remaining work.
