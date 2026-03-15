import { readFileSync } from 'node:fs';
import Handlebars from 'handlebars';
import type { TemplateContext } from '../types.js';

// Register custom helpers
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

export function renderTemplate(templatePath: string, context: TemplateContext | (TemplateContext & Record<string, unknown>)): string {
  const source = readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(source, { noEscape: true });
  return template(context);
}

export function readStaticFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}
