import type { PersistedGame } from './types';

const STORAGE_KEY = 'anagrammes-francais.game.v1';

export function saveGame(game: PersistedGame): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

export function loadGame(): PersistedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedGame;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  localStorage.removeItem(STORAGE_KEY);
}
