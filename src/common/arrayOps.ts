import * as z from "zod";

export const InputSchema = z.object({
  size: z.number().int().min(1000).max(500000).default(100000),
  seed: z.number().optional(),
});

export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export interface ArrayOpsResult {
  inputSize: number;
  filteredSize: number;
  totalScore: string;
  groupedCounts: Record<string, number>;
  topItem: { id: number; score: string } | null;
  durationMs?: number;
}

export function runArrayOps(size: number, seed?: number): ArrayOpsResult {
  const random = seed !== undefined ? seededRandom(seed) : Math.random;

  const categories = ["A", "B", "C", "D"] as const;
  const arr = Array.from({ length: size }, (_, i) => ({
    id: i,
    value: random(),
    name: `item-${i}`,
    category: categories[Math.floor(random() * 4)]!,
  }));

  const filtered = arr.filter((x) => x.value > 0.3);
  const mapped = filtered.map((x) => ({
    ...x,
    score: x.value * 100,
    normalized: x.value / 0.7,
  }));
  const sorted = mapped.sort((a, b) => b.score - a.score);
  const total = sorted.reduce((acc, x) => acc + x.score, 0);

  const grouped = sorted.reduce<Record<string, number>>((acc, x) => {
    acc[x.category] = (acc[x.category] || 0) + 1;
    return acc;
  }, {});

  return {
    inputSize: size,
    filteredSize: filtered.length,
    totalScore: total.toFixed(2),
    groupedCounts: grouped,
    topItem: sorted[0]
      ? { id: sorted[0].id, score: sorted[0].score.toFixed(2) }
      : null,
  };
}
