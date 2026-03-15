import { execSync } from 'node:child_process';
import type { AgentAdapter, AgentConfig } from '../types.js';

export class ClaudeCodeAdapter implements AgentAdapter {
  name: string;
  private model: string;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.model = config.model ?? 'sonnet';
  }

  async execute(opts: {
    prompt: string;
    workdir: string;
    timeout: number;
  }): Promise<{ exitCode: number; duration: number; toolCalls?: number }> {
    const start = Date.now();
    try {
      const escapedPrompt = opts.prompt.replace(/"/g, '\\"');
      const result = execSync(
        `claude --print --model ${this.model} --allowed-tools '*' --output-format json "${escapedPrompt}"`,
        {
          cwd: opts.workdir,
          timeout: opts.timeout,
          encoding: 'utf-8',
          stdio: 'pipe',
          maxBuffer: 50 * 1024 * 1024,
        },
      );
      const duration = Date.now() - start;

      let toolCalls: number | undefined;
      try {
        const parsed = JSON.parse(result);
        toolCalls = parsed.usage?.tool_uses ?? undefined;
      } catch {
        // output may not be valid JSON
      }

      return { exitCode: 0, duration, toolCalls };
    } catch (error) {
      const duration = Date.now() - start;
      return { exitCode: (error as any)?.status ?? 1, duration };
    }
  }
}
