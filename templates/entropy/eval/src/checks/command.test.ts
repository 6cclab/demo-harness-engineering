import { describe, expect, it } from 'vitest';
import { runCommandCheck } from './command.js';

describe('runCommandCheck', () => {
  it('passes when command exits 0', async () => {
    const result = await runCommandCheck(
      { check: 'harness_passes', points: 10, description: 'test' },
      process.cwd(),
      'true',
    );
    expect(result.passed).toBe(true);
    expect(result.points).toBe(10);
  });

  it('fails when command exits non-zero', async () => {
    const result = await runCommandCheck(
      { check: 'harness_passes', points: 10, description: 'test' },
      process.cwd(),
      'false',
    );
    expect(result.passed).toBe(false);
    expect(result.points).toBe(0);
    expect(result.error).toContain('exit code');
  });
});
