import { describe, expect, it } from "vitest";
import { formatProbes, measure } from "../../src/camera/perfProbe";

describe("perfProbe", () => {
  it("retourne le résultat de la fonction mesurée", () => {
    expect(measure("calc", () => 42)).toBe(42);
  });

  it("expose la moyenne glissante dans le résumé", () => {
    measure("probe-test", () => undefined);
    expect(formatProbes()).toMatch(/probe-test \d+\.\dms/);
  });
});
