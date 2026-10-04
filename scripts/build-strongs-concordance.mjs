import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.resolve(process.argv[2] || '');
const outputPath = path.resolve(rootDir, 'public', 'strongs-concordance.json');

if (!process.argv[2] || !existsSync(sourceDir) || !statSync(sourceDir).isDirectory()) {
  throw new Error('Pass the extracted interlinear_bibledata/src directory as the first argument.');
}

const files = readdirSync(sourceDir).filter((file) => file.endsWith('.json'));
const concordance = new Map();

for (const file of files) {
  const entries = JSON.parse(readFileSync(path.join(sourceDir, file), 'utf8'));
  if (!Array.isArray(entries)) continue;

  for (const entry of entries) {
    if (typeof entry.id !== 'string' || !/^\d{8}$/.test(entry.id) || !Array.isArray(entry.verse)) continue;

    for (const word of entry.verse) {
      const number = typeof word.number === 'string' ? word.number.toUpperCase() : '';
      if (!/^[HG]\d+$/.test(number)) continue;

      if (!concordance.has(number)) concordance.set(number, new Set());
      concordance.get(number).add(entry.id);
    }
  }
}

const index = Object.fromEntries(Array.from(concordance, ([number, references]) => [
  number,
  Array.from(references).sort(),
]));

writeFileSync(outputPath, `${JSON.stringify(index)}\n`, 'utf8');
console.log(`Wrote ${Object.keys(index).length} Strong numbers to ${outputPath}`);