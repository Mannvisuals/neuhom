import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The engine must stay deterministic and AI-free. This test fails if anyone
 * adds network calls or AI SDK imports to the calculation code.
 */
describe("engine guardrails", () => {
  const dir = fileURLToPath(new URL("..", import.meta.url));
  const files = [...readdirSync(dir), ...readdirSync(join(dir, "config")).map((f) => join("config", f))].filter((f) =>
    f.endsWith(".ts"),
  );

  it.each(files)("%s has no network or AI dependencies", (f) => {
    const src = readFileSync(join(dir, f), "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/from\s+["'](openai|@anthropic-ai|@google\/generative-ai|axios)/);
    expect(src).not.toMatch(/Math\.random\s*\(/);
  });
});
