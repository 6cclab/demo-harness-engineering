import type { AgentAdapter, AgentConfig } from '../types.js';

export class OpenAICompatibleAdapter implements AgentAdapter {
  name: string;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.config = config;
  }

  async execute(opts: {
    prompt: string;
    workdir: string;
    timeout: number;
  }): Promise<{ exitCode: number; duration: number; toolCalls?: number }> {
    // TODO: Implement agentic loop with tool definitions
    // See spec: docs/superpowers/specs/2026-03-14-eval-framework-design.md
    // section "openai-compatible adapter" for design
    throw new Error(
      `OpenAI-compatible adapter "${this.name}" is not yet implemented. ` +
        'Use claude-code or manual adapter instead.',
    );
  }
}
