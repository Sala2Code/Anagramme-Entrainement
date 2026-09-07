import type { DictionaryIndex } from './dictionary';
import type { Tile } from './types';
import { signature } from './normalization';

function subsetSignatures(letters: string[], allowedLengths: Set<number>): Set<string> {
  const keys = new Set<string>();
  const n = letters.length;
  const maxMask = 1 << n;

  for (let mask = 1; mask < maxMask; mask += 1) {
    let subset = '';
    let size = 0;
    for (let i = 0; i < n; i += 1) {
      if (mask & (1 << i)) {
        subset += letters[i];
        size += 1;
      }
    }
    if (allowedLengths.has(size)) keys.add(signature(subset));
  }

  return keys;
}

export function findSolutions(
  rack: Tile[],
  lengths: number[],
  dictionary: DictionaryIndex,
): string[] {
  const allowedLengths = new Set(lengths);
  const keys = subsetSignatures(
    rack.map((tile) => tile.letter),
    allowedLengths,
  );
  const result = new Set<string>();

  for (const key of keys) {
    for (const word of dictionary.bySignature.get(key) ?? []) {
      if (allowedLengths.has(word.length)) result.add(word);
    }
  }

  return [...result].sort((a, b) => a.length - b.length || a.localeCompare(b, 'fr'));
}
