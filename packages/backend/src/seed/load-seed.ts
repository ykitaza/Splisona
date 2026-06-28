import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ABTestRepository } from "../domain/ports/abtest-repository.js";
import type { EvaluationRepository } from "../domain/ports/evaluation-repository.js";
import { test1, evals1, test2, evals2 } from "./seed-data.js";

const SEED_ASSETS = join(dirname(fileURLToPath(import.meta.url)), "../../seed");
const SEED_USER = "local-user";

export async function loadSeedIfEmpty(
  testRepo: ABTestRepository,
  evalRepo: EvaluationRepository,
  uploadDir: string,
) {
  const existing = await testRepo.findAllByUser(SEED_USER);
  if (existing.length > 0) return;

  console.log("[seed] Seeding sample report data...");

  for (const test of [test1, test2]) {
    await testRepo.save(test);

    for (const side of ["A", "B"] as const) {
      const srcFile = join(SEED_ASSETS, side === "A" ? "design-a.png" : "design-b.png");
      const destKey = `${SEED_USER}/${test.testId}/${side}.png`;
      const destPath = join(uploadDir, destKey);
      mkdirSync(dirname(destPath), { recursive: true });
      if (existsSync(srcFile)) {
        copyFileSync(srcFile, destPath);
      }
    }
  }

  for (const ev of [...evals1, ...evals2]) {
    await evalRepo.save(ev);
  }

  console.log("[seed] Done: 2 tests, 12 evaluations");
}
