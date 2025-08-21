export function getKeywordsArray(input: string): string[] {
  if (!input) return [];
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function getReplacementArray(input: string): string[] {
  if (!input) return [];
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function getUniqueLines(input: string): string[] {
  if (!input) return [];
  const lines = input.replace(/\r/g, "").split("\n");
  const unique = Array.from(new Set(lines));
  return unique;
}

export function joinLines(lines: string[]): string {
  return (lines || []).join("\n");
}

export function filterWithAnyKeywordCaseInsensitive(lines: string[], keywords: string[]): string[] {
  if (!lines.length || !keywords.length) return [];
  const regexes = buildRegexChunks(keywords, { caseInsensitive: true });
  return lines.filter(line => regexes.some(rx => rx.test(line)));
}

export function filterWithoutAnyKeywordCaseInsensitive(lines: string[], keywords: string[]): string[] {
  if (!lines.length) return [];
  if (!keywords.length) return [...lines];
  const regexes = buildRegexChunks(keywords, { caseInsensitive: true });
  return lines.filter(line => !regexes.some(rx => rx.test(line)));
}

export function splitAtBeginning(lines: string[], keywords: string[]): { withKeywords: string[]; withoutKeywords: string[] } {
  // Match keywords immediately following a tab character
  const regexes = buildRegexChunks(keywords, { wrapper: '\\t(?:{kw})' });
  const withKeywords = lines.filter(item => regexes.some(rx => rx.test(item)));
  const withoutKeywords = lines.filter(item => !regexes.some(rx => rx.test(item)));
  return { withKeywords, withoutKeywords };
}

export function splitByCellInnerValue(lines: string[], keywords: string[]): { withKeywords: string[]; withoutKeywords: string[] } {
  // Match keywords wrapped by single spaces on both sides to mirror original logic
  const regexes = buildRegexChunks(keywords, { wrapper: ' (?:{kw}) ' });
  const withKeywords = lines.filter(item => regexes.some(rx => rx.test(item)));
  const withoutKeywords = lines.filter(item => !regexes.some(rx => rx.test(item)));
  return { withKeywords, withoutKeywords };
}

export function splitAtEnding(lines: string[], keywords: string[]): { withKeywords: string[]; withoutKeywords: string[] } {
  // Match keywords immediately followed by a tab character
  const regexes = buildRegexChunks(keywords, { wrapper: '(?:{kw})\\t' });
  const withKeywords = lines.filter(item => regexes.some(rx => rx.test(item)));
  const withoutKeywords = lines.filter(item => !regexes.some(rx => rx.test(item)));
  return { withKeywords, withoutKeywords };
}

export function replaceValuesCaseSensitive(lines: string[], keywords: string[], replacements: string[]): string[] {
  if (keywords.length !== replacements.length) {
    throw new Error('differentCountError');
  }
  if (!lines.length || !keywords.length) return [...lines];
  const map = new Map<string, string>();
  for (let i = 0; i < keywords.length; i++) map.set(keywords[i], replacements[i]);
  const pattern = new RegExp(`(?:${joinEscaped(keywords)})(?=[\t ])`, 'g');
  return lines.map(line =>
    line.replace(pattern, (matched) => {
      const rep = map.get(matched);
      return rep !== undefined ? rep : matched;
    })
  );
}

export function replaceValuesCaseInsensitive(lines: string[], keywords: string[], replacements: string[]): string[] {
  if (keywords.length !== replacements.length) {
    throw new Error('differentCountError');
  }
  if (!lines.length || !keywords.length) return [...lines];
  const map = new Map<string, string>();
  for (let i = 0; i < keywords.length; i++) map.set(keywords[i].toLowerCase(), replacements[i]);
  // left boundary: start or space/tab; right boundary: space/tab or end
  const pattern = new RegExp(`(^|[\t ])((?:${joinEscaped(keywords)}))(?=(?:[\t ]|$))`, 'gi');
  return lines.map(line =>
    line.replace(pattern, (_full, left: string, word: string) => {
      const rep = map.get(word.toLowerCase());
      return left + (rep !== undefined ? rep : word);
    })
  );
}

export function replaceValuesUpperCase(lines: string[], keywords: string[], replacements: string[]): string[] {
  // If no keywords OR no replacements provided, just uppercase entire lines
  if (!keywords.length || !replacements.length) {
    return lines.map(line => line.toUpperCase());
  }
  if (keywords.length !== replacements.length) {
    throw new Error('differentCountError');
  }
  if (!lines.length || !keywords.length) return [...lines];
  const map = new Map<string, string>();
  for (let i = 0; i < keywords.length; i++) map.set(keywords[i].toUpperCase(), replacements[i].toUpperCase());
  const pattern = new RegExp(`(^|[\t ])((?:${joinEscaped(keywords.map(k => k.toUpperCase()))}))(?=(?:[\t ]|$))`, 'g');
  return lines.map(line =>
    line.toUpperCase().replace(pattern, (_full, left: string, word: string) => {
      const rep = map.get(word);
      return left + (rep !== undefined ? rep : word);
    })
  );
}

// ========== Helpers for performance ==========
function escapeRegex(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function joinEscaped(keywords: string[]): string {
  // Escape and join with |, skipping empty strings
  return keywords.filter(Boolean).map(escapeRegex).join('|');
}

function buildRegexChunks(
  keywords: string[],
  opts?: { caseInsensitive?: boolean; wrapper?: string }
): RegExp[] {
  const caseInsensitive = opts?.caseInsensitive === true;
  const wrapper = opts?.wrapper; // e.g., "\\t(?:{kw})" or " (?:{kw}) "
  const chunks: RegExp[] = [];
  const BATCH = 250; // limit alternatives per regex to avoid gigantic patterns
  for (let i = 0; i < keywords.length; i += BATCH) {
    const slice = keywords.slice(i, i + BATCH).filter(Boolean).map(escapeRegex);
    if (!slice.length) continue;
    const body = slice.join('|');
    const pattern = wrapper ? wrapper.replace('{kw}', body) : `(?:${body})`;
    chunks.push(new RegExp(pattern, caseInsensitive ? 'i' : ''));
  }

  return chunks;
}


