import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { executeCheck } from './checks/index.js';
import type {
  CheckResult,
  DimensionScore,
  FailedCheck,
  Grade,
  GradeOptions,
  ReportCard,
  RubricCheck,
  TaskCard,
} from './types.js';

export function computeGrade(score: number, max: number): Grade {
  if (max === 0) return 'A';
  const pct = (score / max) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

export function scoreDimension(
  checks: CheckResult[],
  max: number,
): DimensionScore {
  const score = checks.reduce((sum, c) => sum + c.points, 0);
  return { score, max, checks };
}

export function parseTaskCard(filePath: string): TaskCard {
  const content = readFileSync(filePath, 'utf-8');
  return parseYaml(content) as TaskCard;
}

export async function gradeTask(
  taskCard: TaskCard,
  opts: GradeOptions,
): Promise<ReportCard> {
  const workdir = resolve(opts.workdir);
  const baseline = opts.baseline;

  // Run auto checks for each dimension
  const correctnessResults: CheckResult[] = [];
  for (const check of taskCard.rubric.correctness) {
    correctnessResults.push(await executeCheck(check, workdir, baseline));
  }

  const completenessResults: CheckResult[] = [];
  for (const check of taskCard.rubric.completeness) {
    completenessResults.push(await executeCheck(check, workdir, baseline));
  }

  const patternResults: CheckResult[] = [];
  for (const check of taskCard.rubric.pattern_adherence) {
    patternResults.push(await executeCheck(check, workdir, baseline));
  }

  // Compute dimension scores
  const correctnessMax = taskCard.rubric.correctness.reduce(
    (s, c) => s + c.points,
    0,
  );
  const completenessMax = taskCard.rubric.completeness.reduce(
    (s, c) => s + c.points,
    0,
  );
  const patternMax = taskCard.rubric.pattern_adherence.reduce(
    (s, c) => s + c.points,
    0,
  );

  const correctness = scoreDimension(correctnessResults, correctnessMax);
  const completeness = scoreDimension(completenessResults, completenessMax);
  const pattern_adherence = scoreDimension(patternResults, patternMax);

  const autonomyMax = taskCard.rubric.autonomy.max_points;
  const efficiencyMax = taskCard.rubric.efficiency.max_points;
  const autonomy: DimensionScore = {
    score: opts.autonomy ?? 0,
    max: autonomyMax,
    scoring: 'manual',
  };
  const efficiency: DimensionScore = {
    score: opts.efficiency ?? 0,
    max: efficiencyMax,
    scoring: 'manual',
  };

  // Compute totals
  const autoScore =
    correctness.score + completeness.score + pattern_adherence.score;
  const autoMax = correctnessMax + completenessMax + patternMax;
  const manualScore = (opts.autonomy ?? 0) + (opts.efficiency ?? 0);
  const manualMax = autonomyMax + efficiencyMax;

  const totalScore = autoScore + manualScore;
  const totalMax = autoMax + manualMax;

  const grade = computeGrade(autoScore, autoMax);
  const hasManualScores =
    opts.autonomy !== undefined || opts.efficiency !== undefined;
  const compositeGrade = hasManualScores
    ? computeGrade(totalScore, totalMax)
    : undefined;

  // Collect failed checks using index-based matching
  const failedChecks: FailedCheck[] = [];
  const dimensionPairs: [string, CheckResult[], RubricCheck[]][] = [
    ['correctness', correctnessResults, taskCard.rubric.correctness],
    ['completeness', completenessResults, taskCard.rubric.completeness],
    ['pattern_adherence', patternResults, taskCard.rubric.pattern_adherence],
  ];
  for (const [dimension, results, rubricChecks] of dimensionPairs) {
    for (let i = 0; i < results.length; i++) {
      if (!results[i].passed) {
        failedChecks.push({
          dimension,
          check: results[i].check,
          description: results[i].description,
          points_lost: rubricChecks[i]?.points ?? 0,
        });
      }
    }
  }

  // Get baseline ref for report
  let baselineRef = baseline;
  try {
    const { execSync } = await import('node:child_process');
    baselineRef = execSync(`git rev-parse ${baseline}`, {
      cwd: workdir,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
  } catch {
    // keep the raw ref string
  }

  return {
    task_id: taskCard.id,
    title: taskCard.title,
    timestamp: new Date().toISOString(),
    agent: opts.agent,
    baseline_ref: baselineRef,
    dimensions: {
      correctness,
      completeness,
      pattern_adherence,
      autonomy,
      efficiency,
    },
    total_score: totalScore,
    total_max: totalMax,
    auto_score: autoScore,
    auto_max: autoMax,
    grade,
    composite_grade: compositeGrade,
    failed_checks: failedChecks,
  };
}
