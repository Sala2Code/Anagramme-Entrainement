const ligatures: Record<string, string> = {
  Œ: 'OE',
  Æ: 'AE',
};

export function normalizeWord(input: string): string {
  const expanded = input
    .trim()
    .toUpperCase()
    .replace(/[ŒÆ]/g, (char) => ligatures[char] ?? char);

  return expanded
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

export function signature(word: string): string {
  return normalizeWord(word).split('').sort().join('');
}
