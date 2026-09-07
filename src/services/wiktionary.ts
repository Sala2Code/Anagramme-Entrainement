import { normalizeWord } from '../game/normalization';

export type DefinitionResult = {
  word: string;
  extract: string;
  pageUrl: string;
};

type ApiResponse = {
  error?: { code: string };
  parse?: { title: string; text: string };
  query?: { search?: Array<{ title: string }> };
};

type PageDefinition = {
  extract: string;
  pageUrl: string;
  hasDefinitions: boolean;
  relatedTitles: string[];
};

const cache = new Map<string, DefinitionResult>();

async function request(params: Record<string, string>): Promise<ApiResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const query = new URLSearchParams({ ...params, format: 'json', formatversion: '2', origin: '*' });
    const response = await fetch(`https://fr.wiktionary.org/w/api.php?${query}`, { signal: controller.signal });
    if (!response.ok) throw new Error();
    const data = await response.json() as ApiResponse;
    if (data.error && data.error.code !== 'missingtitle') throw new Error();
    return data;
  } catch {
    throw new Error('Impossible de joindre le Wiktionnaire. Vérifie ta connexion et réessaie.');
  } finally {
    window.clearTimeout(timeout);
  }
}

function cleanText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  // Keep the meaning, but leave out quotations, examples and reference markers.
  copy.querySelectorAll('ul, dl, ol, .example, .sources, .reference, .mw-editsection, script, style')
    .forEach((node) => node.remove());
  return copy.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function extractFrenchDefinitions(html: string): Omit<PageDefinition, 'pageUrl'> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const headings = [...doc.querySelectorAll('h2')];
  const frenchIndex = headings.findIndex((heading) =>
    heading.querySelector('[id="fr"]') || /^Français\b/.test(heading.textContent?.trim() ?? ''),
  );
  if (frenchIndex === -1) return { extract: '', hasDefinitions: false, relatedTitles: [] };

  // A page can describe the same spelling in several languages. Read only French.
  const range = doc.createRange();
  range.setStartAfter(headings[frenchIndex]);
  const nextLanguage = headings[frenchIndex + 1];
  if (nextLanguage) range.setEndBefore(nextLanguage);
  else range.setEndAfter(doc.body.lastChild!);
  const section = doc.createElement('div');
  section.append(range.cloneContents());
  section.querySelectorAll('table, figure, .thumb, .mw-editsection, .reference, .references, script, style')
    .forEach((node) => node.remove());

  const definitions: string[] = [];
  const relatedTitles: string[] = [];
  const paragraphs: string[] = [];
  const hasDefinitionHeadings = Boolean(section.querySelector('.titredef'));
  let inDefinition = !hasDefinitionHeadings;
  for (const element of section.querySelectorAll('h3, h4, h5, h6, ol, p')) {
    if (/^H[3-6]$/.test(element.tagName)) {
      inDefinition = Boolean(element.querySelector('.titredef')) || (!hasDefinitionHeadings
        && /^(?:Nom|Verbe|Adjectif|Adverbe|Pronom|Préposition|Conjonction|Interjection|Article|Déterminant|Onomatopée|Locution|Symbole)\b/i.test(cleanText(element)));
    } else if (inDefinition && element.tagName === 'OL' && !element.closest('ul, dl')) {
      for (const item of element.children) {
        const text = cleanText(item);
        if (text) {
          definitions.push(text);
          // Inflected forms and spelling variants often only point to the base word.
          const copy = item.cloneNode(true) as Element;
          copy.querySelectorAll('ul, ol, dl, .example, .sources').forEach((node) => node.remove());
          const links = [...copy.querySelectorAll<HTMLAnchorElement>('a[href^="/wiki/"]')];
          const lastLink = links.at(-1);
          if (lastLink) {
            const linkedTitle = decodeURIComponent(new URL(lastLink.getAttribute('href')!, 'https://fr.wiktionary.org').pathname.slice(6));
            if (/^[\p{L}\p{M}]+$/u.test(linkedTitle)) relatedTitles.push(linkedTitle);
          }
        }
      }
    } else if (inDefinition && element.tagName === 'P' && !element.closest('li, ul, dl')) {
      const text = cleanText(element);
      if (text) paragraphs.push(text);
    }
  }

  const unique = [...new Set(definitions)];
  return {
    extract: unique.length
      ? unique.map((text, index) => `${index + 1}. ${text}`).join('\n\n')
      : paragraphs.join('\n\n'),
    hasDefinitions: unique.length > 0,
    relatedTitles: unique.length > 0 && unique.every((text) =>
      /^(?:\([^)]*\)\s*)*(?:(?:Première|Deuxième|Troisième) personne|(?:Pluriel|Singulier|Féminin|Masculin|Participe)\b|Variante\b|Ancienne orthographe\b|Orthographe\b)/i.test(text),
    ) ? [...new Set(relatedTitles)].slice(0, 2) : [],
  };
}

async function readPage(title: string): Promise<PageDefinition | null> {
  const data = await request({ action: 'parse', page: title, prop: 'text', redirects: '1', disableeditsection: '1' });
  if (!data.parse) return null;
  const content = extractFrenchDefinitions(data.parse.text);
  if (!content.extract) return null;
  return {
    ...content,
    pageUrl: `https://fr.wiktionary.org/wiki/${encodeURIComponent(data.parse.title)}#fr`,
  };
}

export async function fetchDefinition(word: string): Promise<DefinitionResult> {
  const title = word.trim().toLowerCase();
  const cached = cache.get(title);
  if (cached) return { ...cached, word };

  let page = await readPage(title);
  if (!page?.hasDefinitions) {
    try {
      // Scrabble removes accents and expands ligatures: ECOLE → école, COEUR → cœur.
      const data = await request({
        action: 'query', list: 'search', srsearch: `intitle:${title}`,
        srnamespace: '0', srlimit: '10', srprop: '',
      });
      const candidates = [...new Set((data.query?.search ?? []).map((item) => item.title))]
        .filter((candidate) => candidate !== title && /^[\p{L}\p{M}]+$/u.test(candidate)
          && normalizeWord(candidate) === normalizeWord(title))
        .sort((a, b) => Number(a !== a.toLowerCase()) - Number(b !== b.toLowerCase()));
      for (const candidate of candidates.slice(0, 6)) {
        const alternative = await readPage(candidate);
        if (alternative?.hasDefinitions) {
          page = alternative;
          break;
        }
        page ??= alternative;
      }
    } catch (error) {
      // A search failure must not discard text already obtained from the entry.
      if (!page) throw error;
    }
  }

  let extract = page?.extract;
  for (const relatedTitle of page?.relatedTitles ?? []) {
    if (relatedTitle.toLowerCase() === title) continue;
    try {
      const related = await readPage(relatedTitle);
      if (related?.extract && related.pageUrl !== page?.pageUrl) {
        extract += `\n\nSens de « ${relatedTitle} » :\n\n${related.extract}`;
      }
    } catch {
      // Keep the original definition if the base entry cannot be loaded.
    }
  }

  const result: DefinitionResult = {
    word,
    extract: extract ?? 'Aucune définition française n’a été trouvée pour cette graphie. Tu peux poursuivre la recherche sur le Wiktionnaire.',
    pageUrl: page?.pageUrl ?? `https://fr.wiktionary.org/wiki/Spécial:Recherche?search=${encodeURIComponent(title)}`,
  };
  if (page) cache.set(title, result);
  return result;
}
