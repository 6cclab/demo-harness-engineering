import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  addManagedFile,
  hashContent,
  hasFileChanged,
  isManaged,
  isUserOwned,
  markUserOwned,
  readManifest,
  writeManifest,
} from './manifest.js';

describe('manifest', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harness-manifest-'));
  });

  it('returns empty manifest when file does not exist', () => {
    const m = readManifest(dir);
    expect(m.version).toBe('1.0.0');
    expect(m.managed).toEqual({});
    expect(m.userOwned).toEqual([]);
  });

  it('round-trips manifest through write/read', () => {
    const m = addManagedFile(
      { version: '1.0.0', managed: {}, userOwned: [] },
      'foo.ts',
      'hello',
    );
    writeManifest(dir, m);
    const read = readManifest(dir);
    expect(read.managed['foo.ts'].contentHash).toBe(hashContent('hello'));
  });

  it('isManaged returns true for managed files', () => {
    const m = addManagedFile(
      { version: '1.0.0', managed: {}, userOwned: [] },
      'foo.ts',
      'content',
    );
    expect(isManaged(m, 'foo.ts')).toBe(true);
    expect(isManaged(m, 'bar.ts')).toBe(false);
  });

  it('isUserOwned returns true for user-owned files', () => {
    const m = { version: '1.0.0', managed: {}, userOwned: ['AGENTS.md'] };
    expect(isUserOwned(m, 'AGENTS.md')).toBe(true);
    expect(isUserOwned(m, 'foo.ts')).toBe(false);
  });

  it('hasFileChanged detects modifications', () => {
    const content = 'original';
    writeFileSync(join(dir, 'test.ts'), 'modified');
    const m = addManagedFile(
      { version: '1.0.0', managed: {}, userOwned: [] },
      'test.ts',
      content,
    );
    expect(hasFileChanged(m, dir, 'test.ts')).toBe(true);
  });

  it('hasFileChanged returns false for unchanged files', () => {
    const content = 'same';
    writeFileSync(join(dir, 'test.ts'), content);
    const m = addManagedFile(
      { version: '1.0.0', managed: {}, userOwned: [] },
      'test.ts',
      content,
    );
    expect(hasFileChanged(m, dir, 'test.ts')).toBe(false);
  });

  it('markUserOwned moves file from managed to userOwned', () => {
    let m = addManagedFile(
      { version: '1.0.0', managed: {}, userOwned: [] },
      'AGENTS.md',
      'content',
    );
    m = markUserOwned(m, 'AGENTS.md');
    expect(isManaged(m, 'AGENTS.md')).toBe(false);
    expect(isUserOwned(m, 'AGENTS.md')).toBe(true);
  });
});
