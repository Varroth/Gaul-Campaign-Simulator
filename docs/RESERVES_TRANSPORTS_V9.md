# Paid Reserves, Bloodletter Invocation and Ground Transport — Alpha 0.9

**Source of truth:** [Gaul Campaign: Renegades New Recruit catalogue](https://github.com/Varroth/Gaul-Campaign-Renegades), read-only. This stage does not alter the catalogue. Values are also checked against the live XML on every GitHub Actions run.

## Reserves

In the Army Builder, use the **Start** selector for a unit to declare **In Reserves**. The unit is paid for as normal and stays off the battlefield. During round 2 or later, select **Deploy from edge** in the Battlefield's Purchased Reserves panel, then a highlighted legal square near the friendly deployment edge, more than 9 simulated inches from enemies (each grid tile represents approximately 2 inches).

The simulator uses a simplified, general-purpose arrival window and board-edge rule. Mission-specific caps, Strategic Reserves entry edges, Deep Strike distances, turn-specific restrictions and arrival exceptions are **not yet completely implemented**.

## Bloodletter Invocation

Once per army per battle, during the simulator's Movement phase from round 2, a friendly, unshocked **Bloodmarked Thralls** unit can place an **already purchased Bloodletters unit declared in Reserves**, within 6 simulated inches of the Thralls and more than 9 inches from enemy units. The Invocation consumes no points and grants no extra unit; invalid positions do not spend the one-use allowance. The Daemon allies' 25% army points limit is enforced in the roster.

The source ability specifies **at the end of Movement** and obeying mission-specific Reserves timing and capacity restrictions. The current simulator supports an action during Movement and the round-two conservative timing rule, **not the exact end-of-phase timing or all missions**.

## Ground transports

| Carrier | Spaces | Special considerations |
| --- | ---: | --- |
| Razorback Fire-support Carrier | 6 | Ordinary power-armoured Chapter infantry only, no Terminators/Gravis/Jump Pack |
| Rhino Carrier | 10 | Ordinary power-armoured infantry; no Terminators/Jump Packs |
| Land Raider | 12 | Terminators count as 2 spaces |
| Spartan Assault Tank | 20 | Terminators count as 2 spaces |
| Mastodon Heavy Transport | 30 | Terminators count as 2 spaces |

These are the **currently supported ground carrier types**. The Army Builder offers an **Embark** choice only if an eligible purchased carrier is in the same army. The combined manifests of all assigned units, including attached Leaders, must fit within capacity. Vehicles must start on the battlefield.

Passengers remain off-grid while embarked; they do not move, fight, shoot or claim objectives independently. To disembark, select their control in the Purchased Reserves / Embarked Passengers panel during Movement and choose an adjacent empty tile next to a stationary carrier. AI units use the same disembarkation restrictions.

Transport destruction currently triggers a simplified adjacent emergency exit, or destroys trapped passengers when no square is available. Precise core-game emergency rolls, assault-ramp charge exceptions, vehicle firing decks, weapon fire from transports, pre-battle movement, Drop Pod arrival and all transport detachments **remain incomplete**.

## Verification status

The 74 Infernal Warriors entries **remain Synced** unless each full source profile and battlefield mechanic passes a separate revision-pinned review. This implementation adds verified *source statements and regression checks*, **not Verified unit badges**.

CI runs:
- `node --test tests/*.test.cjs`
- `python scripts/audit_transport_reserves.py upstream/Infernal_Warriors.cat`

The New Recruit repository is not modified by this release.
