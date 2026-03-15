import type { CheckResult, RubricCheck } from '../types.js';
import { runCommandCheck } from './command.js';
import { checkFileExists, checkFileModified } from './file.js';
import { checkGrepMatch, checkGrepNoMatch } from './grep.js';

const COMMAND_CHECKS: Record<string, string> = {
  harness_passes: 'pnpm harness',
  type_check_passes: 'pnpm type-check',
  lint_passes: 'pnpm check',
  import_boundary: 'pnpm check:imports',
};

export async function executeCheck(
  check: RubricCheck,
  workdir: string,
  baseline: string,
): Promise<CheckResult> {
  if (check.check in COMMAND_CHECKS) {
    return runCommandCheck(check, workdir, COMMAND_CHECKS[check.check]);
  }

  if (check.check === 'unit_tests_pass') {
    const filter = check.filter ?? '';
    const cmd = filter
      ? `pnpm turbo run test --filter ${filter}`
      : 'pnpm turbo run test';
    return runCommandCheck(check, workdir, cmd);
  }

  if (check.check === 'file_exists') {
    return checkFileExists(check, workdir);
  }
  if (check.check === 'file_modified') {
    return checkFileModified(check, workdir, baseline);
  }

  if (check.check === 'grep_match') {
    return checkGrepMatch(check, workdir);
  }
  if (check.check === 'grep_no_match') {
    return checkGrepNoMatch(check, workdir);
  }

  return {
    check: check.check,
    passed: false,
    points: 0,
    description: check.description,
    error: `Unknown check type: ${check.check}`,
  };
}
