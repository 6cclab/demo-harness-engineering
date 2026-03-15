/** Task card rubric check — a single assertion in the rubric */
export interface RubricCheck {
  check: string;
  points: number;
  description: string;
  path?: string;
  pattern?: string;
  filter?: string;
}

/** Manual scoring dimension */
export interface ManualDimension {
  scoring: 'manual';
  max_points: number;
  description: string;
}

/** A rubric dimension — either a list of auto checks or a manual score */
export type RubricDimension = RubricCheck[] | ManualDimension;

/** Full rubric across all five dimensions */
export interface Rubric {
  correctness: RubricCheck[];
  completeness: RubricCheck[];
  pattern_adherence: RubricCheck[];
  autonomy: ManualDimension;
  efficiency: ManualDimension;
}

/** Parsed task card from YAML */
export interface TaskCard {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category:
    | 'backend-only'
    | 'client-only'
    | 'full-stack'
    | 'schema-change'
    | 'bug-fix'
    | 'refactor';
  prompt: string;
  rubric: Rubric;
  max_score: number;
}

/** Result of a single check execution */
export interface CheckResult {
  check: string;
  passed: boolean;
  points: number;
  description: string;
  error?: string;
}

/** Scored dimension in the report card */
export interface DimensionScore {
  score: number;
  max: number;
  checks?: CheckResult[];
  scoring?: 'manual';
}

/** Failed check entry in the report */
export interface FailedCheck {
  dimension: string;
  check: string;
  description: string;
  points_lost: number;
}

/** Grade letter */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Full report card output */
export interface ReportCard {
  task_id: string;
  title: string;
  timestamp: string;
  agent: string;
  baseline_ref: string;
  dimensions: {
    correctness: DimensionScore;
    completeness: DimensionScore;
    pattern_adherence: DimensionScore;
    autonomy: DimensionScore;
    efficiency: DimensionScore;
  };
  total_score: number;
  total_max: number;
  auto_score: number;
  auto_max: number;
  grade: Grade;
  composite_grade?: Grade;
  failed_checks: FailedCheck[];
}

/** Agent adapter interface (used by runner, Approach C) */
export interface AgentAdapter {
  name: string;
  execute(opts: {
    prompt: string;
    workdir: string;
    timeout: number;
  }): Promise<{ exitCode: number; duration: number; toolCalls?: number }>;
}

/** Agent config from YAML */
export interface AgentConfig {
  name: string;
  type: 'claude-code' | 'openai-compatible' | 'manual';
  endpoint?: string;
  model?: string;
  api_key?: string;
  timeout?: number;
  max_tokens?: number;
  system_prompt_override?: string;
}

/** CLI options for the grade command */
export interface GradeOptions {
  task?: string;
  all?: boolean;
  baseline: string;
  workdir: string;
  agent: string;
  autonomy?: number;
  efficiency?: number;
  upload?: boolean;
}

/** Weekly summary format */
export interface WeeklySummary {
  week: string;
  runs: number;
  agents: Record<
    string,
    { avg_grade: Grade; avg_auto_pct: number; tasks_run: number }
  >;
  framework_ab?: {
    with_harness: { avg_auto_pct: number };
    without_harness: { avg_auto_pct: number };
    harness_lift: string;
  };
  worst_dimension: string;
  most_failed_check: string;
}
