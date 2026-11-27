/**
 * Every number the engine did not receive from the user or from product data
 * is recorded as an Assumption, so the UI can show it and the user can
 * correct it.
 */

export type AssumptionSource =
  /** derived from published guidance (e.g. EN 12464-1) — still to be verified per project */
  | "standard_guidance"
  /** Neuhom design default, chosen by us, configurable */
  | "neuhom_default"
  /** idealised/generic model used because no photometric data exists */
  | "generic_model"
  /** value estimated from a photograph — not a measurement */
  | "photo_estimate"
  /** value typed by the user as approximate */
  | "user_estimate";

export interface Assumption {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  source: AssumptionSource;
  note?: string;
}

export class AssumptionLog {
  private readonly items = new Map<string, Assumption>();

  add(a: Assumption): void {
    this.items.set(a.id, a);
  }

  list(): Assumption[] {
    return [...this.items.values()];
  }
}
