import { normalizeWord, signature } from './normalization';

export type DictionaryIndex = {
  words: Set<string>;
  bySignature: Map<string, string[]>;
  count: number;
};

export async function loadDictionary(): Promise<DictionaryIndex> {
  const response = await fetch(`${import.meta.env.BASE_URL}dictionary.txt`, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Impossible de charger le dictionnaire (${response.status}).`);
  }

  const raw = await response.text();
  const words = new Set<string>();
  const bySignature = new Map<string, string[]>();

  for (const line of raw.split(/\r?\n/)) {
    const word = normalizeWord(line);
    if (word.length < 2 || word.length > 7 || !/^[A-Z]+$/.test(word)) continue;
    if (words.has(word)) continue;
    words.add(word);

    const key = signature(word);
    const bucket = bySignature.get(key) ?? [];
    bucket.push(word);
    bySignature.set(key, bucket);
  }

  for (const bucket of bySignature.values()) {
    bucket.sort((a, b) => a.localeCompare(b, 'fr'));
  }

  return { words, bySignature, count: words.size };
}
