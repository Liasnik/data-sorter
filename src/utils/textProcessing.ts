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
  const upperKeywords = keywords.map(k => k.toUpperCase());
  return lines.filter(line => {
    const upperLine = line.toUpperCase();
    return upperKeywords.some(k => upperLine.includes(k));
  });
}

export function filterWithoutAnyKeywordCaseInsensitive(lines: string[], keywords: string[]): string[] {
  if (!lines.length) return [];
  if (!keywords.length) return [...lines];
  const upperKeywords = keywords.map(k => k.toUpperCase());
  return lines.filter(line => {
    const upperLine = line.toUpperCase();
    return !upperKeywords.some(k => upperLine.includes(k));
  });
}

export function splitAtBeginning(lines: string[], keywords: string[]): { withKeywords: string[]; withoutKeywords: string[] } {
  const withKeywords = lines.filter(item => {
    return keywords.some(allowed => item.includes(`\t${allowed}`));
  });
  const withoutKeywords = lines.filter(item => {
    return !keywords.some(forbidden => item.includes(`\t${forbidden}`));
  });
  return { withKeywords, withoutKeywords };
}

export function splitByCellInnerValue(lines: string[], keywords: string[]): { withKeywords: string[]; withoutKeywords: string[] } {
  const withKeywords = lines.filter(item => {
    return keywords.some(allowed => item.includes(` ${allowed} `));
  });
  const withoutKeywords = lines.filter(item => {
    return !keywords.some(forbidden => item.includes(` ${forbidden} `));
  });
  return { withKeywords, withoutKeywords };
}

export function splitAtEnding(lines: string[], keywords: string[]): { withKeywords: string[]; withoutKeywords: string[] } {
  const withKeywords = lines.filter(item => {
    return keywords.some(allowed => item.includes(`${allowed}\t`));
  });
  const withoutKeywords = lines.filter(item => {
    return !keywords.some(forbidden => item.includes(`${forbidden}\t`));
  });
  return { withKeywords, withoutKeywords };
}

export function replaceValuesCaseSensitive(lines: string[], keywords: string[], replacements: string[]): string[] {
  if (keywords.length !== replacements.length) {
    throw new Error('Different number of keywords and replacements. Please provide correct data.');
  }
  const result = [...lines];
  for (let i = 0; i < keywords.length; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = result[j].replace(`${keywords[i]} `, `${replacements[i]} `);
      result[j] = result[j].replace(`${keywords[i]}\t`, `${replacements[i]}\t`);
    }
  }
  return result;
}

export function replaceValuesUpperCase(lines: string[], keywords: string[], replacements: string[]): string[] {
  if (keywords.length !== replacements.length) {
    throw new Error('Different number of keywords and replacements. Please provide correct data.');
  }
  const result: string[] = [];
  for (let j = 0; j < lines.length; j++) {
    let upperLine = lines[j].toUpperCase();
    for (let i = 0; i < keywords.length; i++) {
      upperLine = upperLine.replace(`${keywords[i].toUpperCase()}\t`, `${replacements[i]}\t`);
      upperLine = upperLine.replace(`${keywords[i].toUpperCase()} `, `${replacements[i]} `);
    }
    result.push(upperLine);
  }
  return result;
}


