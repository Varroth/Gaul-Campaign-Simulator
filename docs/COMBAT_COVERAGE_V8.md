# Infernal Warriors — Combat Integration Report (Alpha 0.8)

**Source of truth:** The read-only New Recruit faction catalogue [`Infernal_Warriors.cat`](https://github.com/Varroth/Gaul-Campaign-Renegades/blob/main/Infernal_Warriors.cat). Current baseline: 74 selectable units, source revision 24. GitHub Actions re-checks the latest XML on each simulator update.

## Implemented as simplified but tested engine rules

| System | What the simulator models |
|---|---|
| Lost Cohort starting Chaplain | Models the character separately within the paid formation, including its wounds, attacks, 5+ Feel No Pain and self-regeneration. Does not charge duplicate points. Supports both Power Armour and Terminator Armour. |
| Cohort supervision | If the starting Chaplain is killed, 4+ Control Test at each Command-phase start. A living friendly Chaplain or Orvath Krail within six 2-inch cells supervises instead. |
| Aggressive Pursuit | Failed test moves toward and locks targeting/charges to the nearest enemy, preserving Objective Control. If no move is legal, the unit remains in place. No voluntary objective mission action is simulated. |
| Afflicted Ferocity | Adds one attack on **one** melee profile for each surviving afflicted model; does not give the bonus to the Chaplain. |
| Precision | Precision weapons may wound an attached Leader before bodyguards are destroyed; separate Leader injury and death are tracked. Regular attacks allocate to bodyguards first. |
| Named character abilities | Varroth's first-fatal-blow roll (5+), Chaplain/Orvath one-use Battle-shock rerolls, Bannon's post-charge Battle-shock and directed-target rerolls. |
| Directed Objective | A player can mark an enemy in Movement/Command phase with a friendly officer; AI selects a target. A supported melee attack gets limited rerolls if another friendly Infernal Warriors Astartes is nearby. Visibility/Voxmaster and detachment triggers are not complete. |
| Unit-specific combat abilities | Selected source-named one-die rerolls for hit/wound/save, reduced damage, charge-die rerolls, and the limited Battle-shock interactions. Each ability is tagged in the unit's source list as modeled or reference only. |
| Advance | Roll once, add the extra grid movement; advancing prevents ordinary shooting/charging, with Assault weapon shooting permitted. Supported advance modifiers from source profiles are available. |
| Roster limits | Per-datasheet maximums, named characters unique, combined two Lost Cohort cap, 25% Khorne daemon points cap for the IW contingent, two audited model-per-five equipment limits. |

## Not fully implemented

The following require additional game-engine subsystems, not merely more UI selectors: full reserves/deep strike and turn-one Cohort Insertion, exact model/terrain line of sight (only wall-occlusion has been added), exact inch-based movement and aura boundaries, terrain categories, transport embarkation/capacity/disembarkation, advanced weapon interactions, full Battle-shock/mission action restrictions, stratagems and Detachment Points, all enhancements, model-by-model allocation for mixed-stat squads, aircraft travel/hover, all multiple nested New Recruit equipment conditions, and every specialized unit ability. The unit profile status remains **Synced**, never automatically **Verified**.

## Source coverage and regression

`node --test tests/*.test.cjs` checks unit setup, selection limits, mixed gear, damage and combat effects. Browser smoke tests cover GUI selection and the actual source-XML parser. GitHub Actions also checks source XML structure and a live derived named-ability coverage report using `scripts/audit_abilities.py`.

**Interpretation:** “Source ability: Modeled” means a specific combat effect has a tested simplified implementation; it does **not** certify the entire datasheet or official 40K rules. “Partial” means only some source conditions are represented. “Reference only” means the source text is visible but has no battle effect yet. All unit points/advanced rules must be cross-checked with New Recruit before real tabletop use.


## Incremental individual-unit verification pass

The engine now blocks ranged attacks through impassable wall tiles, including shots that only touch a wall corner. The AI and highlighted human targets apply the same obstruction check. This is **not** full line of sight: models, terrain height, aircraft and visibility rules are still approximations. No new Verified badges were awarded by this upgrade.
