import { describe, expect, it } from "vitest";
import { WaveManager } from "../../src/games/kung-foo/WaveManager";

describe("WaveManager", () => {
  it("incrémente l'index de vague et les points à chaque vague", () => {
    const manager = new WaveManager("easy");
    const first = manager.nextWave();
    const second = manager.nextWave();
    expect(second.waveIndex).toBe(first.waveIndex + 1);
    expect(second.pointsPerKill).toBeGreaterThan(first.pointsPerKill);
  });

  it("ne planifie jamais deux ninjas sur la même plateforme", () => {
    const manager = new WaveManager("hard");
    const schedule = manager.getSpawnSchedule(manager.nextWave());
    const keys = schedule.map(({ platform }) => `${platform.side}-${platform.stageIdx}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
