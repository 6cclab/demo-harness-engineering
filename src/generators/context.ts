import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import type { GeneratedFile, ResolvedConfig, TemplateContext } from '../types.js';
import { readStaticFile, renderTemplate } from './helpers.js';

const TEMPLATES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../templates');

export function generateContext(config: ResolvedConfig, context: TemplateContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  if (config.context.agentsMd) {
    // Root AGENTS.md
    files.push({
      path: 'AGENTS.md',
      content: renderTemplate(join(TEMPLATES_DIR, 'context/AGENTS.md.hbs'), context),
      managed: true,
    });

    // Per-app AGENTS.md
    for (const app of config.apps) {
      const appContext = { ...context, app };
      const source = readFileSync(join(TEMPLATES_DIR, 'context/AGENTS.app.md.hbs'), 'utf-8');
      const template = Handlebars.compile(source, { noEscape: true });
      files.push({
        path: `${app.path}/AGENTS.md`,
        content: template(appContext),
        managed: true,
      });
    }
  }

  if (config.context.claudeMd) {
    files.push({
      path: 'CLAUDE.md',
      content: renderTemplate(join(TEMPLATES_DIR, 'context/CLAUDE.md.hbs'), context),
      managed: true,
    });
  }

  if (config.context.adr) {
    files.push({
      path: 'docs/adr/template.md',
      content: readStaticFile(join(TEMPLATES_DIR, 'context/adr/template.md')),
      managed: true,
    });
  }

  // Skills
  for (const skill of config.context.skills) {
    const skillTemplatePath = join(TEMPLATES_DIR, `skills/${skill}/SKILL.md.hbs`);
    try {
      files.push({
        path: `.claude/skills/${skill}/SKILL.md`,
        content: renderTemplate(skillTemplatePath, context),
        managed: true,
      });
    } catch {
      // Skill template doesn't exist — skip (user-created skills won't have templates)
    }
  }

  return files;
}
