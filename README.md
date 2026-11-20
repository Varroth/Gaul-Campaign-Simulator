# Gaul Campaign Simulator — Alpha 0.11.1

An unofficial tactical playtest for Gaul Campaign: Renegades.

**[Play the simulator](https://varroth.github.io/Gaul-Campaign-Simulator/)** · [Quality report and remaining work](docs/QUALITY_REPORT_V11.md) · [Automated checks](https://github.com/Varroth/Gaul-Campaign-Simulator/actions/workflows/simulator-tests.yml)

## Catalogue connection

The Army Builder reads the public [New Recruit repository](https://github.com/Varroth/Gaul-Campaign-Renegades) without changing it. It checks on startup, when an inactive tab is revisited, or when **Sync latest units** is selected. Source checksums are verified before importing a revision. Unchanged files are reused from the browser cache; previously loaded catalogues remain available when the source is offline.

The current source contains **353 imported profiles**: 96 Infernal Warriors (74 units and 22 characters), 169 Frozen Cogs, 61 Abandoned Dead, and 27 Silver Tempests. Silver Tempests revision 13 now replaces the eight built-in estimates with published source units. The simulator detects these additions through the existing read-only sync.

A source refresh does not change the profiles of a battle already underway. Saved linked battles pin source revisions and reject incompatible changed catalogues rather than silently changing the army.

## Alpha 0.11.1 changes

Live verification caught four Silver Tempests characters being interpreted as five-model squads. The importer now reads root Keywords profiles as well as category links, preserves explicit squad sizes, and refreshes older cached imports. Published character costs are unchanged.

Army Configuration now offers all four Infernal Warriors detachments with the published 2/3 DP budgets. All sixteen paid upgrades follow the catalogue's actual recipient links, with one choice per unit or eligible generic Chaplain, distinct-name caps, copy limits, and exact extra points. The source audit exercises all **119 eligible recipient/upgrade mappings**.

All four core detachment doctrines now have engine paths: charge re-rolls for Breach and Ruin/Crimson Onslaught, and joint declarations for War Hounds’ Legacy/Iron Reavers. Twenty-three of the twenty-four stratagems have handlers: sixteen active actions and seven optional automatic defensive reactions. **No Quarter Asked remains unavailable because its “nearby” range is undefined.** Coverage is partial where timing, shared doctrines or model geometry are abstracted.

CP is a scenario setting, not Detachment Points. Starting CP and income default to zero; configure the agreed values in Army Configuration. Income applies at each side's own turn start, including turn one. Defensive reactions are opt-in for both sides and spend CP at their trigger. The training engine limits each named stratagem to one use per phase. No claim is made that these defaults define an official edition's CP economy.

New regression cases cover points, eligibility, timing, CP, use limits, re-roll stacking, coordinated attacks, protective reactions, saved rules, and deterministic Battle Lab runs. Older unenhanced configured saves retain their original IDs. The quality pass also corrected duplicate automatic turn-start processing and applies the daemon cap against the agreed battle limit when one is provided.

## Alpha 0.10.2 changes

The quality pass corrected per-model cost duplication, active personnel-branch counts, the allied-daemon cap for the army's own engines, the standard Assault Drop Pod, and cache migration from earlier versions. Catalogue refreshes now remove obsolete fields while keeping active battles unchanged.

Named-rule tests now cover Independent Forge, Boarding Priority, Forward Observer, Seal the Breach, Reactor Hunter, Thermic Line, Siege Charge, The Last Sentence, Dread Hunter, Void Deployment, and Siegebreaker. Directed Objective checks source OFFICER/VOXMASTER keywords, attached Leaders, visibility and Signal Grid range. These implementations retain Partial labels where grid geometry or timing is simplified. The ability audit and interface now use the same coverage manifest.

- Nested Infernal Warriors equipment choices, including optional vehicle guns, with inactive branches excluded. Vehicles and standalone characters now expose their supported configuration menus. Explicit multiple vehicle weapons retain their proper counts, and heavy vehicles retain their full published wounds.
- Thirteen transport capacity mappings; paid passengers can start aboard transports in Reserves. Eligible units can use Deep Strike. An explicit end-of-Movement **Reinforcements** step controls arrivals and Bloodletter Invocation.
- Arrival and disembarkation restrictions, Land Raider Assault Ramp, selected carrier benefits, emergency disembarkation, external Stormraven Dreadnought capacity, and immobile Deathstorm pods.
- Shared targeting checks for the interface and engine, indirect shooting, Anti-keyword thresholds, One Shot tracking, Hazardous consequences, alternative weapon profiles, corrected charge distances, and additional source ability actions.
- Valid saves with multiple offboard units now load correctly. Duplicate or unpurchased unit identities are rejected. Catalogue caching fits a standard browser quota and reports storage failures.
- Regression checks now include every actual imported profile and reachable Infernal formation/equipment branch, plus real Chromium checks for desktop, mobile, save/load, complete battles and offline startup.

These changes extend an abstract grid simulation. **Full tabletop rules parity is not complete.** Exact mission-pack reserves, aircraft flight paths, all detachment/stratagem interactions, conditional New Recruit modifiers, and model-by-model allocation still need work. The [quality report](docs/QUALITY_REPORT_V11.md) distinguishes executed software checks from unresolved rules.

## Confidence labels

| Label | Meaning |
| --- | --- |
| Verified | A complete source-to-engine review passed, pinned to the source checksum and profile fingerprint. **No profiles currently qualify.** |
| Synced | Imported from the New Recruit source; full combat and configuration fidelity remains incomplete. |
| Sim Estimate | A built-in simulator profile, independent of the source catalogue. |
| Est. points / Calc. points | A separate warning that points are estimated or extrapolated. |

Expand a unit's **Verification details** for its individual remaining issues. Ability labels distinguish implemented, partial and reference-only effects; they do not replace the overall verification status. See the [verification policy](docs/VERIFICATION_POLICY.md).

## Run and test

Serve this directory with `python -m http.server`, then open the local address. The website has no runtime npm dependencies, login, analytics, or server-side account storage. Internet access is needed for fresh source sync; saves stay in the current browser unless exported.

```sh
npm ci --ignore-scripts
npm test
npm run qc:catalogues -- /path/to/Gaul-Campaign-Renegades verification-artifacts
python -m pip install playwright==1.62.0
python -m playwright install chromium
python tests/browser-release-qc.py /path/to/Gaul-Campaign-Renegades
```

GitHub Actions runs these checks plus the XML audits and three focused browser regressions. Its downloadable **simulator-quality-report** contains per-unit reports, source checksums, execution results and browser screenshots. XML parsing dependencies are used only by tests; the website uses the browser's native XML parser.

Gaul Campaign Simulator is an independent non-commercial fan project, not affiliated with or endorsed by Games Workshop.
