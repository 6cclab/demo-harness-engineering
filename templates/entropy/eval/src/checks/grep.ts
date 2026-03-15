import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckResult, RubricCheck } from '../types.js';

export async function checkGrepMatch(
  check: RubricCheck,
  workdir: string,
): Promise<CheckResult> {
  const pattern = check.path ?? '';
  const regex = new RegExp(check.pattern ?? '');
  const files = globSync(pattern, { cwd: workdir });

  for (const file of files) {
    const content = readFileSync(join(workdir, file), 'utf-8');
    if (regex.test(content)) {
      return {
        check: check.check,
        passed: true,
        points: check.points,
        description: check.description,
      };
    }
  }

  return {
    check: check.check,
    passed: false,
    points: 0,
    description: check.description,
    error: `Pattern "${check.pattern}" not found in "${pattern}"`,
  };
}

export async function checkGrepNoMatch(
  check: RubricCheck,
  workdir: string,
): Promise<CheckResult> {
  const pattern = check.path ?? '';
  const regex = new RegExp(check.pattern ?? '');
  const files = globSync(pattern, { cwd: workdir });

  for (const file of files) {
    const content = readFileSync(join(workdir, file), 'utf-8');
    if (regex.test(content)) {
      return {
        check: check.check,
        passed: false,
        points: 0,
        description: check.description,
        error: `Pattern "${check.pattern}" found in "${file}"`,
      };
    }
  }

  return {
    check: check.check,
    passed: true,
    points: check.points,
    description: check.description,
  };
}
