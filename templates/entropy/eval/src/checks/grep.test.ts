import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { checkGrepMatch, checkGrepNoMatch } from './grep.js';

describe('checkGrepMatch', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'eval-grep-'));
    writeFileSync(
      join(dir, 'controller.ts'),
      `
import { ControllerFactory } from './base.js';
import { handleError } from './handleError.js';

export class NoteController extends ControllerFactory {}
`,
    );
  });

  it('passes when pattern is found', async () => {
    const result = await checkGrepMatch(
      {
        check: 'grep_match',
        path: 'controller.ts',
        pattern: 'ControllerFactory',
        points: 5,
        description: 'test',
      },
      dir,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when pattern is not found', async () => {
    const result = await checkGrepMatch(
      {
        check: 'grep_match',
        path: 'controller.ts',
        pattern: 'console\\.log',
        points: 5,
        description: 'test',
      },
      dir,
    );
    expect(result.passed).toBe(false);
  });
});

describe('checkGrepNoMatch', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'eval-grep-'));
    writeFileSync(join(dir, 'clean.ts'), 'logger.info("hello");');
    writeFileSync(join(dir, 'dirty.ts'), 'console.log("debug");');
  });

  it('passes when pattern is absent from all files', async () => {
    const result = await checkGrepNoMatch(
      {
        check: 'grep_no_match',
        path: 'clean.ts',
        pattern: 'console\\.log',
        points: 5,
        description: 'test',
      },
      dir,
    );
    expect(result.passed).toBe(true);
  });

  it('fails when pattern is found', async () => {
    const result = await checkGrepNoMatch(
      {
        check: 'grep_no_match',
        path: 'dirty.ts',
        pattern: 'console\\.log',
        points: 5,
        description: 'test',
      },
      dir,
    );
    expect(result.passed).toBe(false);
  });
});
