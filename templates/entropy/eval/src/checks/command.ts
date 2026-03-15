import { execSync } from 'node:child_process';
import type { CheckResult, RubricCheck } from '../types.js';

export async function runCommandCheck(
  check: RubricCheck,
  workdir: string,
  command: string,
): Promise<CheckResult> {
  try {
    execSync(command, {
      cwd: workdir,
      stdio: 'pipe',
      timeout: 120_000,
    });
    return {
      check: check.check,
      passed: true,
      points: check.points,
      description: check.description,
    };
  } catch (error) {
    const exitCode = (error as any)?.status ?? 'unknown';
    return {
      check: check.check,
      passed: false,
      points: 0,
      description: check.description,
      error: `exit code ${exitCode}`,
    };
  }
}
