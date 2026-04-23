import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Toyota Camry lease defaults', () => {
  it('keeps a Camry-specific 55% 36-month residual in generated program defaults', () => {
    const seedAllPrograms = readRepoFile('seed-all-programs.ts');
    const seedDefaultPrograms = readRepoFile('seed-default-programs.ts');

    expect(seedAllPrograms).toMatch(/Camry[\s\S]*rv:\s*0\.55/);
    expect(seedDefaultPrograms).toMatch(/Camry[\s\S]*rv:\s*0\.55/);
  });
});