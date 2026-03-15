import { describe, expect, it } from 'vitest';
import { computeGrade, scoreDimension } from './grader.js';
import type { CheckResult } from './types.js';

describe('computeGrade', () => {
  it('returns A for 90%+', () => expect(computeGrade(95, 100)).toBe('A'));
  it('returns B for 75-89%', () => expect(computeGrade(80, 100)).toBe('B'));
  it('returns C for 60-74%', () => expect(computeGrade(65, 100)).toBe('C'));
  it('returns D for 40-59%', () => expect(computeGrade(45, 100)).toBe('D'));
  it('returns F for <40%', () => expect(computeGrade(30, 100)).toBe('F'));
  it('handles 0 max gracefully', () => expect(computeGrade(0, 0)).toBe('A'));
});

describe('scoreDimension', () => {
  it('sums passed check points', () => {
    const checks: CheckResult[] = [
      { check: 'a', passed: true, points: 10, description: 'a' },
      { check: 'b', passed: false, points: 0, description: 'b', error: 'fail' },
      { check: 'c', passed: true, points: 5, description: 'c' },
    ];
    const result = scoreDimension(checks, 20);
    expect(result.score).toBe(15);
    expect(result.max).toBe(20);
  });
});
