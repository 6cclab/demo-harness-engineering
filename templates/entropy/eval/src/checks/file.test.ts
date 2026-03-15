import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { checkFileExists } from './file.js';

describe('checkFileExists', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'eval-test-'));
  });

  it('passes when glob matches a file', async () => {
    writeFileSync(join(dir, 'test.ts'), 'content');
    const result = await checkFileExists(
      { check: 'file_exists', path: '*.ts', points: 5, description: 'test' },
      dir,
    );
    expect(result.passed).toBe(true);
    expect(result.points).toBe(5);
  });

  it('fails when glob matches nothing', async () => {
    const result = await checkFileExists(
      { check: 'file_exists', path: '*.xyz', points: 5, description: 'test' },
      dir,
    );
    expect(result.passed).toBe(false);
    expect(result.points).toBe(0);
  });

  it('supports nested glob patterns', async () => {
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(join(dir, 'sub', 'deep.ts'), 'content');
    const result = await checkFileExists(
      {
        check: 'file_exists',
        path: '**/deep.ts',
        points: 5,
        description: 'test',
      },
      dir,
    );
    expect(result.passed).toBe(true);
  });
});
