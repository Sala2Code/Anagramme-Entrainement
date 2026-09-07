import type { DictionaryIndex } from './dictionary';
import type { GameSettings, Tile } from './types';
import { findSolutions } from './anagrams';

const DISTRIBUTION: Record<string, number> = {
  A: 9,
  B: 2,
  C: 2,
  D: 3,
  E: 15,
  F: 2,
  G: 2,
  H: 2,
  I: 8,
  J: 1,
  K: 1,
  L: 5,
  M: 3,
  N: 6,
  O: 6,
  P: 2,
  Q: 1,
  R: 6,
  S: 6,
  T: 6,
  U: 6,
  V: 2,
  W: 1,
  X: 1,
  Y: 1,
  Z: 1,
};

const BAG = Object.entries(DISTRIBUTION).flatMap(([letter, count]) => Array(count).fill(letter));

const DEMO_RACKS = [
  ['A', 'E', 'I', 'R', 'S', 'T', 'T'],
  ['A', 'E', 'I', 'N', 'R', 'S', 'T'],
  ['A', 'E', 'I', 'M', 'N', 'R', 'S'],
];

function idForTile(letter: string): string {
  return `${letter}-${crypto.randomUUID()}`;
}

export function createRack(letters?: string[]): Tile[] {
  const picked = letters ?? drawLetters(7);
  return picked.map((letter) => ({ id: idForTile(letter), letter }));
}

export function drawLetters(count: number): string[] {
  const bag = [...BAG];
  const result: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * bag.length);
    result.push(bag.splice(index, 1)[0]);
  }
  return result;
}

export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function drawPlayableRack(
  dictionary: DictionaryIndex,
  settings: GameSettings,
  minSolutions = 8,
): Tile[] {
  if (dictionary.count < 2000) {
    const candidates = DEMO_RACKS
      .map((letters) => createRack(shuffled(letters)))
      .filter((rack) => findSolutions(rack, settings.lengths, dictionary).length > 0);
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  let fallback = createRack();
  let fallbackScore = -1;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const rack = createRack();
    const score = findSolutions(rack, settings.lengths, dictionary).length;
    if (score >= minSolutions) return rack;
    if (score > fallbackScore) {
      fallback = rack;
      fallbackScore = score;
    }
  }

  return fallback;
}
