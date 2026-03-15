import { execSync } from 'node:child_process';
import { globSync } from 'node:fs';
import type { CheckResult, RubricCheck } from '../types.js';

export async function checkFileExists(
  check: RubricCheck,
  workdir: string,
): Promise<CheckResult> {
  const pattern = check.path ?? '';
  const matches = globSync(pattern, { cwd: workdir });

  if (matches.length > 0) {
    return {
      check: check.check,
      passed: true,
      points: check.points,
      description: check.description,
    };
  }
  return {
    check: check.check,
    passed: false,
    points: 0,
    description: check.description,
    error: `No files matched glob "${pattern}"`,
  };
}

export async function checkFileModified(
  check: RubricCheck,
  workdir: string,
  baseline: string,
): Promise<CheckResult> {
  const filePath = check.path ?? '';
  try {
    const diff = execSync(`git diff --name-only ${baseline} -- "${filePath}"`, {
      cwd: workdir,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    if (diff.length > 0) {
      return {
        check: check.check,
        passed: true,
        points: check.points,
        description: check.description,
      };
    }

    const status = execSync(`git status --porcelain -- "${filePath}"`, {
      cwd: workdir,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    if (status.length > 0) {
      return {
        check: check.check,
        passed: true,
        points: check.points,
        description: check.description,
      };
    }

    return {
      check: check.check,
      passed: false,
      points: 0,
      description: check.description,
      error: `File "${filePath}" was not modified vs ${baseline}`,
    };
  } catch {
    return {
      check: check.check,
      passed: false,
      points: 0,
      description: check.description,
      error: `Failed to diff "${filePath}" against ${baseline}`,
    };
  }
}
