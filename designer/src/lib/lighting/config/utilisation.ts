import type { Distribution } from "../types";

/**
 * GENERIC UTILISATION FACTOR (UF) MODEL
 *
 * IMPORTANT: real UF tables are luminaire-specific and come from the
 * manufacturer's photometric data. When a product has an IES/LDT file, a
 * photometric UtilisationProvider should replace this model.
 *
 * Until then Neuhom uses an idealised generic model per distribution family:
 *
 *   UF = UF_base(K) × wallFactor(ρw, K) × ceilingFactor(ρc)
 *
 *  - UF_base(K): reference curve vs room index K for ceiling 0.7 / walls 0.5 /
 *    floor 0.2 (the usual tabulation convention), interpolated linearly.
 *    Values are luminaire-lumen based (LED fittings: light output ratio 1).
 *  - wallFactor = 1 − α · (0.5 − ρw) · min(1, 1/K)
 *    Darker walls absorb more light; the effect is larger in small rooms,
 *    where wall area is large relative to floor area (wall/floor ≈ 2/K).
 *  - ceilingFactor = 1 − β · (0.7 − ρc)
 *    Indirect (cove) lighting depends heavily on the ceiling; direct
 *    downlights much less.
 *
 * These are approximations for early design, calibrated so that typical rooms
 * get fitting counts in line with practical Indian installations (see the
 * calibration tests). They are always reported as "generic_model" assumptions.
 */

export interface UtilisationProfile {
  label: string;
  /** room indices for the base curve, ascending */
  roomIndices: number[];
  /** UF at ceiling 0.7, walls 0.5, floor 0.2 */
  base: number[];
  /** sensitivity to wall reflectance */
  alpha: number;
  /** sensitivity to ceiling reflectance */
  beta: number;
}

const K = [0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

export const UTILISATION_PROFILES: Record<Distribution, UtilisationProfile> = {
  direct_narrow: {
    label: "Direct, narrow beam (spotlights, COB downlights ≤ 45°)",
    roomIndices: K,
    base: [0.55, 0.62, 0.67, 0.72, 0.75, 0.8, 0.83, 0.86, 0.89, 0.91],
    alpha: 0.35,
    beta: 0.05,
  },
  direct_wide: {
    label: "Direct, wide beam (downlights, panels > 45°)",
    roomIndices: K,
    base: [0.46, 0.53, 0.58, 0.63, 0.67, 0.72, 0.76, 0.79, 0.83, 0.86],
    alpha: 0.5,
    beta: 0.1,
  },
  general_diffuse: {
    label: "General diffuse (pendants, opal shades, surface fittings)",
    roomIndices: K,
    base: [0.34, 0.41, 0.46, 0.51, 0.55, 0.6, 0.65, 0.68, 0.72, 0.75],
    alpha: 0.6,
    beta: 0.4,
  },
  indirect: {
    // Includes typical cove-trough losses: in a gypsum cove roughly 40% of the
    // strip's output is absorbed by the trough before reaching the ceiling.
    label: "Indirect (cove lighting, uplighters)",
    roomIndices: K,
    base: [0.12, 0.15, 0.17, 0.2, 0.22, 0.25, 0.27, 0.29, 0.31, 0.33],
    alpha: 0.6,
    beta: 1.2,
  },
};

/** Beam angle at or below which a direct fixture is treated as "narrow". */
export const NARROW_BEAM_THRESHOLD_DEG = 45;
