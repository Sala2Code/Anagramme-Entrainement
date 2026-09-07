import fs from 'node:fs/promises';
import path from 'node:path';

const source = process.argv[2] ?? 'dictionary-source.txt';
const target = process.argv[3] ?? 'public/dictionary.txt';

function normalizeWord(input) {
  return input
    .trim()
    .toUpperCase()
    .replace(/Œ/g, 'OE')
    .replace(/Æ/g, 'AE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

try {
  const raw = await fs.readFile(source, 'utf8');
  const words = [...new Set(raw.split(/\r?\n/).map(normalizeWord))]
    .filter((word) => word.length >= 2 && word.length <= 7)
    .filter((word) => /^[A-Z]+$/.test(word))
    .sort((a, b) => a.length - b.length || a.localeCompare(b, 'fr'));

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${words.join('\n')}\n`, 'utf8');
  console.log(`✓ ${words.length} mots écrits dans ${target}`);
} catch (error) {
  console.error(`Impossible de construire le dictionnaire depuis « ${source} ».`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
