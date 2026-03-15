// === Config Types ===

export interface AppConfig {
  name: string;
  path: string;
  type: 'backend' | 'frontend';
  srcDir?: string;
}

export interface ProjectConfig {
  name?: string;
  scope?: string;
  monorepo?: boolean;
  packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun';
}

export interface ImportBoundaries {
  clientOnlyPackages?: string[];
  approvedCrossAppImports?: Record<string, string[]>;
  packageAppExceptions?: Record<string, string[]>;
}

export interface GoldenPrinciple {
  id: string;
  rule: string;
  check: string;
}

export interface HooksConfig {
  preCommit?: 'lint-staged' | string | false;
  commitMsg?: 'conventional' | false;
}

export interface ContextConfig {
  agentsMd?: boolean;
  claudeMd?: boolean;
  adr?: boolean;
  skills?: string[];
  requiredAppSections?: string[];
  requiredRootSections?: string[];
}

export interface ConstraintsConfig {
  importBoundaries?: ImportBoundaries;
  goldenPrinciples?: GoldenPrinciple[];
  hooks?: HooksConfig;
  linter?: 'biome' | 'eslint' | 'none';
}

export interface StorageConfig {
  type?: 's3' | 'none';
  bucket?: string;
}

export interface CIConfig {
  runner?: string;
  secrets?: 'infisical' | 'github-secrets' | 'none';
  schedule?: string;
}

export interface EntropyConfig {
  eval?: boolean;
  scanner?: boolean;
  storage?: StorageConfig;
  ci?: CIConfig;
}

export interface HarnessConfig {
  project?: ProjectConfig;
  apps?: AppConfig[];
  packages?: string[];
  context?: ContextConfig;
  constraints?: ConstraintsConfig;
  entropy?: EntropyConfig;
}

// === Resolved Config (all defaults filled in) ===

export interface ResolvedAppConfig {
  name: string;
  path: string;
  type: 'backend' | 'frontend';
  srcDir: string;
}

export interface ResolvedConfig {
  project: Required<ProjectConfig>;
  apps: ResolvedAppConfig[];
  packages: string[];
  context: Required<ContextConfig>;
  constraints: {
    importBoundaries: Required<ImportBoundaries>;
    goldenPrinciples: GoldenPrinciple[];
    hooks: Required<HooksConfig>;
    linter: 'biome' | 'eslint' | 'none';
  };
  entropy: {
    eval: boolean;
    scanner: boolean;
    storage: Required<StorageConfig>;
    ci: Required<CIConfig>;
  };
}

// === Template Context ===

export interface TemplateContext {
  project: Required<ProjectConfig>;
  apps: ResolvedAppConfig[];
  packages: string[];
  backendApps: ResolvedAppConfig[];
  frontendApps: ResolvedAppConfig[];
  scope: string;
  appPackageNames: Record<string, string>;
  context: Required<ContextConfig>;
  constraints: ResolvedConfig['constraints'];
  entropy: ResolvedConfig['entropy'];
}

// === Manifest ===

export interface ManagedFileEntry {
  contentHash: string;
}

export interface ManifestFile {
  version: string;
  managed: Record<string, ManagedFileEntry>;
  userOwned: string[];
}

// === Generator Output ===

export interface GeneratedFile {
  path: string;
  content: string;
  managed: boolean;
}

export interface GenerateResult {
  filesWritten: string[];
  warnings: string[];
}

// === Scanner ===

export interface ScanResult {
  name: string;
  scope: string;
  monorepo: boolean;
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun';
  apps: AppConfig[];
  packages: string[];
  linter: 'biome' | 'eslint' | 'none';
}

// === Doctor ===

export interface DoctorResult {
  healthy: boolean;
  issues: string[];
}
