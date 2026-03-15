import { execSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { gradeTask, parseTaskCard } from './grader.js';
import { runEval } from './runner.js';
import { uploadReport, uploadSummary } from './storage.js';
import type {
  Grade,
  GradeOptions,
  ReportCard,
  WeeklySummary,
} from './types.js';

function findMonorepoRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
  } catch {
    return process.cwd();
  }
}

function parseArgs(args: string[]): {
  command: string;
  options: Record<string, string | boolean>;
} {
  const command = args[0] ?? 'grade';
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

async function runGrade(
  options: Record<string, string | boolean>,
): Promise<void> {
  const gradeOpts: GradeOptions = {
    task: options.task as string | undefined,
    all: options.all === true,
    baseline: (options.baseline as string) ?? 'HEAD~1',
    workdir: (options.workdir as string) ?? findMonorepoRoot(),
    agent: (options.agent as string) ?? 'unknown',
    autonomy:
      options.autonomy !== undefined ? Number(options.autonomy) : undefined,
    efficiency:
      options.efficiency !== undefined ? Number(options.efficiency) : undefined,
    upload: options.upload === true,
  };

  let taskPaths: string[] = [];

  if (gradeOpts.all) {
    const evalRoot = resolve(gradeOpts.workdir, 'packages/eval/tasks');
    taskPaths = globSync('*.yaml', { cwd: evalRoot }).map((f) =>
      resolve(evalRoot, f),
    );
  } else if (gradeOpts.task) {
    taskPaths = [resolve(gradeOpts.workdir, gradeOpts.task)];
  } else {
    console.error('Error: provide --task <path> or --all');
    process.exit(1);
  }

  for (const taskPath of taskPaths) {
    const taskCard = parseTaskCard(taskPath);
    console.log(`\nGrading: ${taskCard.title} (${taskCard.id})...`);

    const report = await gradeTask(taskCard, gradeOpts);

    // Print report
    console.log(JSON.stringify(report, null, 2));

    // Print summary line
    const pct =
      report.auto_max > 0
        ? Math.round((report.auto_score / report.auto_max) * 100)
        : 100;
    console.log(
      `\n${report.grade} (${pct}%) — auto: ${report.auto_score}/${report.auto_max}` +
        (report.composite_grade
          ? ` | composite: ${report.composite_grade} (${report.total_score}/${report.total_max})`
          : ''),
    );

    if (report.failed_checks.length > 0) {
      console.log('\nFailed checks:');
      for (const fc of report.failed_checks) {
        console.log(
          `  [${fc.dimension}] ${fc.check}: ${fc.description} (-${fc.points_lost}pts)`,
        );
      }
    }

    // Upload if requested
    if (gradeOpts.upload) {
      const s3Path = await uploadReport(report);
      if (s3Path) {
        console.log(`\nUploaded to ${s3Path}`);
      } else {
        console.warn('\nS3 upload skipped — EVAL_S3_* env vars not configured');
      }
    }
  }
}

async function runRun(
  options: Record<string, string | boolean>,
): Promise<void> {
  const agentConfigPath = options.agent as string | undefined;
  if (!agentConfigPath) {
    console.error('Error: --agent <path-to-agent-yaml> is required');
    process.exit(1);
  }

  const repoRoot = findMonorepoRoot();
  const noHarness = options['no-harness'] === true;
  const upload = options.upload === true;
  const baseline = (options.baseline as string) ?? 'HEAD~1';
  const autonomy =
    options.autonomy !== undefined ? Number(options.autonomy) : undefined;
  const efficiency =
    options.efficiency !== undefined ? Number(options.efficiency) : undefined;

  let taskPaths: string[] = [];

  if (options.all === true) {
    const evalRoot = resolve(repoRoot, 'packages/eval/tasks');
    taskPaths = globSync('*.yaml', { cwd: evalRoot }).map((f) =>
      resolve(evalRoot, f),
    );
  } else if (options.task) {
    taskPaths = [resolve(repoRoot, options.task as string)];
  } else {
    console.error('Error: provide --task <path> or --all');
    process.exit(1);
  }

  for (const taskPath of taskPaths) {
    await runEval({
      taskPath,
      agentConfigPath: resolve(repoRoot, agentConfigPath),
      repoRoot,
      noHarness,
      upload,
      baseline,
      autonomy,
      efficiency,
    });
  }
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function getISOWeek(date: Date): string {
  const d = new Date(date.valueOf());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function gradeFromPct(pct: number): Grade {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

async function runSummary(
  _options: Record<string, string | boolean>,
): Promise<void> {
  const endpoint = process.env.EVAL_S3_ENDPOINT;
  const bucket = process.env.EVAL_S3_BUCKET;
  const accessKeyId = process.env.EVAL_S3_ACCESS_KEY;
  const secretAccessKey = process.env.EVAL_S3_SECRET_KEY;
  const region = process.env.EVAL_S3_REGION ?? 'garage';

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.error(
      'Error: S3 env vars not configured. Set EVAL_S3_ENDPOINT, EVAL_S3_BUCKET, EVAL_S3_ACCESS_KEY, EVAL_S3_SECRET_KEY.',
    );
    process.exit(1);
  }

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  // List all report objects
  const reports: ReportCard[] = [];
  let continuationToken: string | undefined;

  do {
    const listResp = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: 'reports/',
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of listResp.Contents ?? []) {
      if (!obj.Key) continue;
      const getResp = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: obj.Key }),
      );
      if (!getResp.Body) continue;
      const body = await streamToString(getResp.Body as NodeJS.ReadableStream);
      try {
        reports.push(JSON.parse(body) as ReportCard);
      } catch {
        console.warn(`Failed to parse report at ${obj.Key}, skipping.`);
      }
    }

    continuationToken = listResp.NextContinuationToken;
  } while (continuationToken);

  if (reports.length === 0) {
    console.warn('No reports found in S3.');
    process.exit(0);
  }

  // Determine the current week
  const week = getISOWeek(new Date());

  // Filter reports to the current week
  const weekReports = reports.filter((r) => {
    const ts = new Date(r.timestamp);
    return getISOWeek(ts) === week;
  });

  const targetReports = weekReports.length > 0 ? weekReports : reports;

  // Aggregate by agent
  const agentData: Record<string, { autoPcts: number[]; grades: Grade[] }> = {};

  for (const r of targetReports) {
    if (!agentData[r.agent]) {
      agentData[r.agent] = { autoPcts: [], grades: [] };
    }
    const pct =
      r.auto_max > 0 ? Math.round((r.auto_score / r.auto_max) * 100) : 100;
    agentData[r.agent].autoPcts.push(pct);
    agentData[r.agent].grades.push(r.grade);
  }

  const agents: WeeklySummary['agents'] = {};
  for (const [agent, data] of Object.entries(agentData)) {
    const avgAutoPct =
      data.autoPcts.reduce((a, b) => a + b, 0) / data.autoPcts.length;
    agents[agent] = {
      avg_grade: gradeFromPct(avgAutoPct),
      avg_auto_pct: Math.round(avgAutoPct),
      tasks_run: data.autoPcts.length,
    };
  }

  // Worst dimension: find the dimension with the lowest aggregate score ratio
  const dimTotals: Record<string, { score: number; max: number }> = {
    correctness: { score: 0, max: 0 },
    completeness: { score: 0, max: 0 },
    pattern_adherence: { score: 0, max: 0 },
    autonomy: { score: 0, max: 0 },
    efficiency: { score: 0, max: 0 },
  };

  for (const r of targetReports) {
    for (const [dim, ds] of Object.entries(r.dimensions)) {
      if (dimTotals[dim]) {
        dimTotals[dim].score += ds.score;
        dimTotals[dim].max += ds.max;
      }
    }
  }

  let worstDim = 'correctness';
  let worstRatio = Infinity;
  for (const [dim, totals] of Object.entries(dimTotals)) {
    if (totals.max === 0) continue;
    const ratio = totals.score / totals.max;
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worstDim = dim;
    }
  }

  // Most-failed check across all reports
  const checkFailCounts: Record<string, number> = {};
  for (const r of targetReports) {
    for (const fc of r.failed_checks) {
      checkFailCounts[fc.check] = (checkFailCounts[fc.check] ?? 0) + 1;
    }
  }

  let mostFailedCheck = 'none';
  let maxFailCount = 0;
  for (const [check, count] of Object.entries(checkFailCounts)) {
    if (count > maxFailCount) {
      maxFailCount = count;
      mostFailedCheck = check;
    }
  }

  // Harness A/B lift: compare harness vs no-harness runs for same task+agent
  // We identify no-harness by looking for pairs; since reports don't directly
  // record noHarness flag, we gather all reports and compare pairs where one
  // likely came from harness and one from no-harness by existence of duplicates.
  // A simpler heuristic: group by task_id+agent, if there are >= 2 runs compute lift.
  type PairGroup = { runs: ReportCard[] };
  const pairMap: Record<string, PairGroup> = {};
  for (const r of targetReports) {
    const key = `${r.task_id}__${r.agent}`;
    if (!pairMap[key]) pairMap[key] = { runs: [] };
    pairMap[key].runs.push(r);
  }

  let harnessSum = 0;
  let noHarnessSum = 0;
  let pairCount = 0;

  for (const group of Object.values(pairMap)) {
    if (group.runs.length >= 2) {
      // Sort by auto_score descending: higher = with harness (assumption)
      const sorted = [...group.runs].sort(
        (a, b) => b.auto_score - a.auto_score,
      );
      const withPct =
        sorted[0].auto_max > 0
          ? (sorted[0].auto_score / sorted[0].auto_max) * 100
          : 100;
      const withoutPct =
        sorted[1].auto_max > 0
          ? (sorted[1].auto_score / sorted[1].auto_max) * 100
          : 100;
      harnessSum += withPct;
      noHarnessSum += withoutPct;
      pairCount++;
    }
  }

  const summary: WeeklySummary = {
    week,
    runs: targetReports.length,
    agents,
    worst_dimension: worstDim,
    most_failed_check: mostFailedCheck,
  };

  if (pairCount > 0) {
    const avgWith = harnessSum / pairCount;
    const avgWithout = noHarnessSum / pairCount;
    const lift = avgWith - avgWithout;
    summary.framework_ab = {
      with_harness: { avg_auto_pct: Math.round(avgWith) },
      without_harness: { avg_auto_pct: Math.round(avgWithout) },
      harness_lift: `${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%`,
    };
  }

  console.log(JSON.stringify(summary, null, 2));

  const s3Path = await uploadSummary(summary);
  if (s3Path) {
    console.log(`\nSummary uploaded to ${s3Path}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const { command, options } = parseArgs(args);

  switch (command) {
    case 'grade':
      await runGrade(options);
      break;
    case 'run':
      await runRun(options);
      break;
    case 'summary':
      await runSummary(options);
      break;
    default:
      console.error(
        `Unknown command: ${command}. Available: grade, run, summary`,
      );
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
