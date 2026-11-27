/** Thrown when inputs make a calculation physically meaningless. Message is user-facing. */
export class LightingInputError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "LightingInputError";
  }
}

export interface CalcWarning {
  code: string;
  severity: "info" | "warning";
  message: string;
}
