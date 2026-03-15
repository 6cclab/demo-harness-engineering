import type { AgentAdapter } from '../types.js';

export class ManualAdapter implements AgentAdapter {
  name = 'manual';

  async execute(): Promise<{ exitCode: number; duration: number }> {
    return { exitCode: 0, duration: 0 };
  }
}
