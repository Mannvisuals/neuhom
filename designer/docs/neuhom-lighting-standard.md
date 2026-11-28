# Neuhom Lighting Standard — v0.1 (draft)

The rules Neuhom uses to size the **general (ambient) light** in a homeowner's
plan. They live in one place in the code —
`src/lib/lighting/config/density.ts` — so changing a number here changes
every plan.

## The rule

> **General light (lumens) = floor area (sq ft) × lumens per sq ft for the room × room adjustments**
>
> Number of ceiling lights = general light ÷ lumens of one light, then arranged
> in an even grid.

This is the same approach consumer tools and electricians in India use (for
example Wipro's light calculator). Task lights (under-cabinet, bedside, mirror),
accent spotlights, cove strips and decorative pieces are **added on top** and are
not counted in the general light — so the room is properly lit even with the
cove and spots switched off.

## Lumens per sq ft by room

| Room | Min | Target | Max | Notes |
|---|---|---|---|---|
| Living room | 10 | 15 | 20 | |
| Bedroom | 10 | 15 | 20 | bedside lights extra |
| Dining | 15 | 20 | 30 | pendant over the table extra |
| Kitchen | 30 | 35 | 40 | under-cabinet strip extra |
| Bathroom | 40 | 50 | 70 | mirror light extra |
| Balcony | 5 | 8 | 12 | |
| Office (small / home) | 40 | 50 | 60 | desk lamps for long screen work |
| Retail | 50 | 70 | 90 | display spots extra |
| Hospitality | 15 | 20 | 30 | |
| Other | 15 | 20 | 30 | |

Starting values come from commonly published residential guidance
(living/bedroom 10–20, kitchen & dining general 30–40, bathroom 70–80 including
vanity, home office 50–70), reduced where Neuhom adds a separate task light.

**Brightness preference:** Soft × 0.8, Balanced × 1, Bright × 1.25 — always kept
within the room's min–max.

## Room adjustments

| Condition | Adjustment |
|---|---|
| Ceiling above 9.5 ft | + 6% per extra foot, up to + 40% |
| Medium-colour walls | + 5% |
| Wood panelling, exposed brick, mostly glass | + 10% |
| Dark walls | + 15% |

## How fittings are chosen

1. Try each standard fitting size (e.g. downlights 6 / 9 / 12 / 15 W at ~105 lm/W).
2. For each, work out the count and arrange it in an even grid. Lights are never
   further apart than their beam allows.
3. If the grid would overshoot the maximum, step down to fewer lights that still
   meet the minimum.
4. Pick the size that lands in range with the fewest lights, closest to target.

## Examples (generic fittings at ~105 lm/W)

| Room | General light |
|---|---|
| Bedroom 12 × 10 ft | 4 × 6 W downlights |
| Living room 18 × 13 ft | 6 × 6 W downlights |
| Kitchen 10 × 8 ft | 4 × 6 W downlights (+ under-cabinet strip) |
| Bathroom 8 × 6 ft | 2 × 12 W downlights (+ mirror light) |
| Office 15 × 10 ft, no false ceiling | 4 × 18 W surface downlights |
| Office 15 × 10 ft, false ceiling | 2 × 36 W 2×2 ft panels |

These are enforced as tests (`src/lib/design/__tests__/calibration.test.ts`).

## Professional cross-check

The editor (Customise) also shows the lux-based calculation used by
professional tools (lumen method with utilisation and maintenance factors,
EN 12464-1 reference levels). Homeowner plans usually sit below workplace lux
levels — that is expected and matches typical Indian installations.

## To refine this standard

- Compare plans with real Neuhom installations and adjust the table.
- Replace generic fittings with Neuhom products (real lumens per watt).
- Bump the version (`NEUHOM_STANDARD_VERSION`) when the numbers change.
