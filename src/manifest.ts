import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ManifestFile } from './types.js';

const MANIFEST_FILENAME = '.harness-manifest.json';

function emptyManifest(): ManifestFile {
  return { version: '1.0.0', managed: {}, userOwned: [] };
}

export function hashContent(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

export function readManifest(dir: string): ManifestFile {
  const filePath = join(dir, MANIFEST_FILENAME);
  if (!existsSync(filePath)) {
    return emptyManifest();
  }
  return JSON.parse(readFileSync(filePath, 'utf-8')) as ManifestFile;
}

export function writeManifest(dir: string, manifest: ManifestFile): void {
  const filePath = join(dir, MANIFEST_FILENAME);
  writeFileSync(filePath, JSON.stringify(manifest, null, 2) + '\n');
}

export function isManaged(manifest: ManifestFile, path: string): boolean {
  return path in manifest.managed;
}

export function isUserOwned(manifest: ManifestFile, path: string): boolean {
  return manifest.userOwned.includes(path);
}

export function addManagedFile(manifest: ManifestFile, path: string, content: string): ManifestFile {
  return {
    ...manifest,
    managed: {
      ...manifest.managed,
      [path]: { contentHash: hashContent(content) },
    },
  };
}

export function hasFileChanged(manifest: ManifestFile, dir: string, path: string): boolean {
  const entry = manifest.managed[path];
  if (!entry) return false;
  const filePath = join(dir, path);
  if (!existsSync(filePath)) return true;
  const content = readFileSync(filePath, 'utf-8');
  return hashContent(content) !== entry.contentHash;
}

export function markUserOwned(manifest: ManifestFile, path: string): ManifestFile {
  const { [path]: _, ...remaining } = manifest.managed;
  return {
    ...manifest,
    managed: remaining,
    userOwned: [...manifest.userOwned.filter((p) => p !== path), path],
  };
}
