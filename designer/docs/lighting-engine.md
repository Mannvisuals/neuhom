# Neuhom Lighting Calculation Engine

`src/lib/lighting/` — deterministic, tested, AI-free.

## In plain language

When a user designs a room, Neuhom has to answer: *how much light does this room
need, how many fittings deliver it, and where do they go?* This engine answers
that with standard lighting-engineering formulas, not with AI.

- **AI is allowed to:** describe the room (type, finishes, furniture, rough
  proportions from a photo).
- **AI is never allowed to:** decide lux levels, lumens, fixture counts, spacing
  or energy figures. The engine's input schema has no field for those numbers,
  and a test fails if the engine ever imports an AI library or makes a network call.
- **Every number the user didn't provide is listed as an assumption**, with where
  it came from, so it can be shown in the app and corrected.
- **Every result carries a status:**
  - `preliminary` — some dimensions were unknown or estimated from a photo
  - `estimate` — lumen-method result from the user's measurements
  - `photometric` — reserved for the future, when real IES/LDT files are used

## How a calculation works

### 1. Target illuminance — `config/illuminance.ts`
Each space type has a maintained-illuminance range (min / target / max), task
targets, uniformity, minimum CRI, colour temperature range, accent ratio and
typical daily hours.

| Space | Ambient (lx) | Task targets | Source |
|---|---|---|---|
| Living room | 100 / **150** / 250 | Reading 300 | Neuhom default |
| Bedroom | 75 / **100** / 150 | Bedside reading 300, wardrobe 200 (vertical) | Neuhom default |
| Kitchen | 200 / **300** / 400 | Counter 500, hob 500 | Neuhom default |
| Dining | 100 / **150** / 200 | Table 200 | Neuhom default |
| Bathroom | 150 / **200** / 300 | Mirror 300 (vertical) · IP44 min | Neuhom default |
| Balcony | 30 / **50** / 100 | — · IP54 min | Neuhom default |
| Office | 300 / **500** / 750 | Desk 500, U0 0.60, Ra 80 | EN 12464-1 guidance |
| Retail | 300 / **300** / 750 | Till 500, U0 0.40 | EN 12464-1 guidance |
| Hospitality | 100 / **200** / 300 | Reception 300 | Neuhom default |

Residential spaces have no mandatory illuminance standard, so those values are
Neuhom design defaults and are labelled as such. The user's brightness preference
scales the target (soft ×0.8, bright ×1.25) but is always clamped to the range.

### 2. Room geometry — `geometry.ts`
- Mounting height `Hm = ceiling − (pendant drop) − work plane`
- Room index `K = L·W / (Hm·(L+W))`
- Unknown dimensions are replaced by typical Indian room sizes (`config/surfaces.ts`)
  and the result becomes `preliminary`.

### 3. Utilisation factor (UF) — `utilisation.ts`, `config/utilisation.ts`
UF is the share of a fitting's light that reaches the work plane. Real UF tables
are specific to each luminaire and come from manufacturer photometry. Until we
have those, a **generic model** per light-distribution family is used:

```
UF = UF_base(K) × [1 − α(0.5 − ρwall)·min(1, 1/K)] × [1 − β(0.7 − ρceiling)]
```

Families: direct narrow (≤45°), direct wide, general diffuse (pendants), indirect
(cove). The `UtilisationProvider` interface means a photometric provider built from
IES/LDT files can replace the generic model without changing anything else.

### 4. Maintenance factor (MF) — `maintenance.ts`
CIE 97 structure: `MF = LLMF × LSF × LMF × RSMF`
- LLMF: LED output loss, linear to the rated L-value (default L70 @ 25,000 h when
  the datasheet doesn't say) over a 5-year period at the room's daily hours.
- LSF: 1.0 (failed LEDs replaced promptly).
- LMF / RSMF: dirt on fittings / room surfaces, by environment (clean / normal / dirty).

Typical result: living room ≈ 0.80, kitchen ≈ 0.75.

### 5. Lumen method — `ambient.ts`
```
Total lumens needed = E × A / (UF × MF)
Fittings (lumen method) = ⌈ total / lumens per fitting ⌉
```

### 6. Spacing reconciliation — `spacing.ts`
```
Max spacing = min( 2·Hm·tan(beam/2),  1.5 × Hm )
```
A regular grid with half-spacing from the walls is fitted so that spacing is never
exceeded, balancing fewest fittings against a near-square pattern. If spacing forces
more fittings than the lumen method needs, the engine reports the resulting lux and,
if the room becomes over-lit, recommends the per-fitting lumen output that would
hit the target.

### 7. Light distribution & uniformity — `photometry.ts`
Each fitting is modelled as an idealised `I(θ) = I0·cos^m θ` beam (50% intensity at
half the beam angle, flux-conserving). The point-by-point pattern is scaled so its
room average equals the lumen-method value. This gives one consistent lux figure,
an estimate of uniformity (U0), and the data for drawing light pools on the plan.
**This is not a photometric simulation.**

### 8. Task, accent and cove layers
- **Task** (`task.ts`): lumen method over the task zone with a local UF
  (under-cabinet strip 0.6, downlight over task 0.55, pendant 0.45). Linear fittings
  are sized in lm/m.
- **Accent** (`accent.ts`): inverse-square law, `E = I·cos(i)/d²`, sized from the
  space's accent-to-ambient ratio (e.g. 3:1). Default 30° incidence for artwork.
  Reports beam footprint size.
- **Cove** (`cove.ts`): indirect lumen method; sizes strip lm/m for a share of
  ambient (default 30%), with a warning when the ceiling is too dark for cove light to work.

### 9. Energy — `energy.ts`
Connected load (W), lighting power density (W/m²), annual kWh and cost. The
tariff (default ₹8/kWh) is a placeholder; Indian tariffs vary by state and slab.
Product data outside 30–220 lm/W is flagged as suspect.

## Assumption register

| Assumption | Default | Label | Replace with |
|---|---|---|---|
| Residential lux targets | table above | `neuhom_default` | Project brief / client preference |
| Commercial lux targets | EN 12464-1 values | `standard_guidance` | Project specification |
| Surface reflectances | ceiling 0.7, walls 0.5, floor 0.2 | `neuhom_default` | Measured or paint LRV values |
| Work plane height | 0.75 m (0.9 kitchen, 0 balcony) | `neuhom_default` | User input |
| Room size if unknown | typical Indian sizes | `neuhom_default` → `preliminary` | Measurements |
| Photo-estimated sizes | as estimated | `photo_estimate` → `preliminary` | Measurements |
| Utilisation factor | generic model | `generic_model` | Manufacturer UF table / IES file |
| LED lumen maintenance | L70 @ 25,000 h, linear | `generic_model` | Product datasheet (LM-80/TM-21) |
| Maintenance period | 5 years, ~annual cleaning | `neuhom_default` | Client maintenance plan |
| Dirt factors | clean 0.95/0.97, normal 0.90/0.94, dirty 0.85/0.90 | `generic_model` | Site assessment |
| Task local UF | 0.45–0.6 | `generic_model` | Photometric calculation |
| Accent incidence | 30° | `neuhom_default` | Actual aiming |
| Cove share of ambient | 30% | `neuhom_default` | Designer choice |
| Spacing rules | beam-edge overlap, S/H ≤ 1.5 | `generic_model` | Manufacturer max S/H |
| Electricity tariff | ₹8/kWh | `neuhom_default` | User's bill |

All of these live in `src/lib/lighting/config/` and can be overridden per project
with `createConfig({...})`.

## Path to photometric accuracy
1. Parse IES (LM-63) / EULUMDAT files into an intensity table.
2. Implement `PhotometricUtilisationProvider` (UF from the real distribution).
3. Replace the cosine-power model in `photometry.ts` with the measured intensity table.
4. Add inter-reflection (radiosity) for absolute point values. Status then becomes
   `photometric`; until then results are never presented as validated.

## Tests
```bash
npm test
```
82 tests cover the formulas against hand calculations, monotonic behaviour,
flux conservation of the beam model, grid constraints, assumption and status labelling,
input validation, config overrides, determinism, and a guardrail that keeps AI and
network code out of the engine. Mutation checks (breaking a formula on purpose)
confirm the tests catch errors.
