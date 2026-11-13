# Gaul Campaign Simulator — Alpha 0.10

An unofficial tactical playtest for Gaul Campaign: Renegades.

**[Play the simulator](https://varroth.github.io/Gaul-Campaign-Simulator/)** · [Quality report and remaining work](docs/QUALITY_REPORT_V10.md) · [Automated checks](https://github.com/Varroth/Gaul-Campaign-Simulator/actions/workflows/simulator-tests.yml)

## Catalogue connection

The Army Builder reads the public [New Recruit repository](https://github.com/Varroth/Gaul-Campaign-Renegades) without changing it. It checks on startup, when an inactive tab is revisited, or when **Sync latest units** is selected. Source checksums are verified before importing a revision. Unchanged files are reused from the browser cache; previously loaded catalogues remain available when the source is offline.

The current source contains **326 imported profiles**: 96 Infernal Warriors (74 units and 22 characters), 169 Frozen Cogs, and 61 Abandoned Dead. The separate Silver Tempests catalogue has no published root units, so its eight built-in simulator profiles remain available as estimates.

A source refresh does not change the profiles of a battle already underway. Saved linked battles pin source revisions and reject incompatible changed catalogues rather than silently changing the army.

## Alpha 0.10 changes

- Nested Infernal Warriors equipment choices, including optional vehicle guns, with inactive branches excluded. Vehicles and standalone characters now expose their supported configuration menus. Explicit multiple vehicle weapons retain their proper counts, and heavy vehicles retain their full published wounds.
- Twelve transport capacity mappings; paid passengers can start aboard transports in Reserves. Eligible units can use Deep Strike. An explicit end-of-Movement **Reinforcements** step controls arrivals and Bloodletter Invocation.
- Arrival and disembarkation restrictions, Land Raider Assault Ramp, selected carrier benefits, emergency disembarkation, external Stormraven Dreadnought capacity, and immobile Deathstorm pods.
- Shared targeting checks for the interface and engine, indirect shooting, Anti-keyword thresholds, One Shot tracking, Hazardous consequences, alternative weapon profiles, corrected charge distances, and additional source ability actions.
- Valid saves with multiple offboard units now load correctly. Duplicate or unpurchased unit identities are rejected. Catalogue caching fits a standard browser quota and reports storage failures.
- Regression checks now include every actual imported profile and reachable Infernal formation/equipment branch, plus real Chromium checks for desktop, mobile, save/load, complete battles and offline startup.

These changes extend an abstract grid simulation. **Full tabletop rules parity is not complete.** Exact mission-pack reserves, aircraft flight paths, all detachment/stratagem interactions, conditional New Recruit modifiers, and model-by-model allocation still need work. The [quality report](docs/QUALITY_REPORT_V10.md) distinguishes executed software checks from unresolved rules.

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
