const SMOOTHING = 0.9;

const averages = new Map<string, number>();

/** Mesure `fn` et met à jour la moyenne glissante (ms) associée à `label`. */
export function measure<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;
  const previous = averages.get(label);
  averages.set(label, previous === undefined ? elapsed : previous * SMOOTHING + elapsed * (1 - SMOOTHING));
  return result;
}

/** Résumé compact "label 1.2ms" pour l'affichage debug. */
export function formatProbes(): string {
  const lines: string[] = [];
  averages.forEach((ms, label) => lines.push(`${label} ${ms.toFixed(1)}ms`));
  return lines.join("\n");
}
