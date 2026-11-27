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
 * These are approximations for early design. They are always reported to the
 * user as "generic_model" assumptions.
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
    base: [0.48, 0.56, 0.62, 0.68, 0.72, 0.78, 0.82, 0.85, 0.88, 0.9],
    alpha: 0.35,
    beta: 0.1,
  },
  direct_wide: {
    label: "Direct, wide beam (downlights, panels > 45°)",
    roomIndices: K,
    base: [0.38, 0.46, 0.52, 0.58, 0.63, 0.69, 0.74, 0.77, 0.81, 0.84],
    alpha: 0.5,
    beta: 0.2,
  },
  general_diffuse: {
    label: "General diffuse (pendants, opal shades, surface fittings)",
    roomIndices: K,
    base: [0.3, 0.37, 0.42, 0.47, 0.51, 0.57, 0.62, 0.65, 0.7, 0.73],
    alpha: 0.6,
    beta: 0.5,
  },
  indirect: {
    label: "Indirect (cove lighting, uplighters)",
    roomIndices: K,
    base: [0.2, 0.25, 0.29, 0.33, 0.36, 0.41, 0.45, 0.48, 0.52, 0.55],
    alpha: 0.6,
    beta: 1.2,
  },
};

/** Beam angle at or below which a direct fixture is treated as "narrow". */
export const NARROW_BEAM_THRESHOLD_DEG = 45;
