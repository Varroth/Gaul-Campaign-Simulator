# Infernal Warriors roster limits and weapon effects — Alpha 0.7

Source: `Varroth/Gaul-Campaign-Renegades`, `Infernal_Warriors.cat` revision 24, with live SHA-based syncing. The source never receives writes from the simulator.

## Implemented and tested

- **Published unit caps:** root-level roster maximums from the New Recruit XML are carried into linked units. Different formation sizes and edited gear still share one source datasheet identity.
- **Lost Cohort cap:** only two total squads across Power and Terminator armour; each source type also retains its own maximum. The initial Chaplain remains included in these formations.
- **Unique named Leaders:** no duplicate named leader in one force, counting independent heroes and attached characters together. Generic Infernal and Terminator Chaplains may recur.
- **Two narrow wargear quotas:** Despoiler Cadre power weapons are limited to one per five models; Chainbound Reaver hand flamers are limited to one per five. These are parsed only from the matching unambiguous source text. All other complicated menus remain subject to New Recruit validation.
- **Common weapon traits:** simplified Torrent auto-hits, Heavy stationary hit bonus, Rapid Fire extra attacks at half range, Twin-linked wound re-roll, Sustained Hits extra hit on a critical, Lethal Hits automatic wound on critical, Ignores Cover, Melta close-range bonus, Blast additional attacks, Pistol shooting while engaged, and Devastating Wounds bypassing armour on critical wounds.
- **Warp-Aggravated Pain:** an ordinary Infernal Warriors Astartes unit within six 2-inch squares of an enemy Psyker/Daemon takes its Command-phase D6 check (3+ passes; 1–2 gives -1 ranged Hit); Lost Cohort and mortal allies are excluded. The additional psychic retaliation rule and unit exceptions beyond these are not yet simulated.
- **Damage/FNP correction:** rolls Feel No Pain against *all* unsaved damage points before capping applied damage to the remaining Wounds on a single model. No spillover is modeled.

## Known exclusions

Full faction rules, conditional source modifiers, transport/embarkation, official terrain and line of sight, psychic abilities, Lost Cohort berserk control, Pain suppression by Leaders, indirect fire, Hazardous and Precision resolution, conditional auras/stratagems, multiple weapon fire-mode restrictions, non-ordinary model-by-model casualty allocation, and all remaining per-five weapon rules. These must be implemented and audited before **Verified** badges can be awarded.

The browser permits no more than 14 simulated units per side because of its current 12×8 battlefield, even if a source army could field more models. This is a simulator limit, not a New Recruit rule.

The maintained verification ledger remains empty.

## November 11, 2026 — first-five wargear audit (Alpha 0.8.3)

Source-anchored weapon quotas enforced in the selectable bodyguard loadouts:

| Unit | Enforced limit |
| --- | --- |
| Bloodmarked Thralls | One flamer or heavy stubber per full ten models |
| Chainbound Reavers | One hand flamer per full five models |
| Infernal Berzerkers | One plasma pistol per full five models |
| Despoiler Cadre | One power weapon per full five models |
| Void Breachers | One flamer or meltagun per full five models |

The source XML is independently checked in GitHub Actions. These are partial
composition audits only; complex nested wargear rules and full combat effects
are not yet fully verified.
