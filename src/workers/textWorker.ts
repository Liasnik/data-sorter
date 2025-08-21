// Worker for heavy text processing
import {
  getKeywordsArray,
  getReplacementArray,
  getUniqueLines,
  filterWithAnyKeywordCaseInsensitive,
  filterWithoutAnyKeywordCaseInsensitive,
  splitAtBeginning,
  splitByCellInnerValue,
  splitAtEnding,
  replaceValuesCaseInsensitive,
  replaceValuesUpperCase,
  joinLines,
} from '../utils/textProcessing'

type Actions =
  | { id: string; type: 'splitTwo'; input: string; keywords: string }
  | { id: string; type: 'strictBegin' | 'strictInner' | 'strictEnd'; input: string; keywords: string }
  | { id: string; type: 'createWith' | 'createWithout'; input: string; keywords: string }
  | { id: string; type: 'replace' | 'replaceUpper'; input: string; keywords: string; replacements: string }
  | { id: string; type: 'dedup'; input: string }

self.onmessage = (event: MessageEvent<Actions>) => {
  const post = (data: { id: string; ok: boolean; with?: string; without?: string; error?: string }) =>
    (self as unknown as { postMessage: (d: { id: string; ok: boolean; with?: string; without?: string; error?: string }) => void }).postMessage(data)
  const message = event.data
  try {
    const inputLines = getUniqueLines(message.input)
    switch (message.type) {
      case 'splitTwo': {
        const keys = getKeywordsArray(message.keywords)
        const linesWithKeywords = filterWithAnyKeywordCaseInsensitive(inputLines, keys)
        const linesWithoutKeywords = filterWithoutAnyKeywordCaseInsensitive(inputLines, keys)
        post({ id: message.id, ok: true, with: joinLines(linesWithKeywords), without: joinLines(linesWithoutKeywords) })
        return
      }
      case 'strictBegin': {
        const keys = getKeywordsArray(message.keywords)
        const { withKeywords, withoutKeywords } = splitAtBeginning(inputLines, keys)
        post({ id: message.id, ok: true, with: joinLines(withKeywords), without: joinLines(withoutKeywords) })
        return
      }
      case 'strictInner': {
        const keys = getKeywordsArray(message.keywords)
        const { withKeywords, withoutKeywords } = splitByCellInnerValue(inputLines, keys)
        post({ id: message.id, ok: true, with: joinLines(withKeywords), without: joinLines(withoutKeywords) })
        return
      }
      case 'strictEnd': {
        const keys = getKeywordsArray(message.keywords)
        const { withKeywords, withoutKeywords } = splitAtEnding(inputLines, keys)
        post({ id: message.id, ok: true, with: joinLines(withKeywords), without: joinLines(withoutKeywords) })
        return
      }
      case 'createWith': {
        const keys = getKeywordsArray(message.keywords)
        const linesWithKeywords = filterWithAnyKeywordCaseInsensitive(inputLines, keys)
        post({ id: message.id, ok: true, with: joinLines(linesWithKeywords) })
        return
      }
      case 'createWithout': {
        const keys = getKeywordsArray(message.keywords)
        const linesWithoutKeywords = filterWithoutAnyKeywordCaseInsensitive(inputLines, keys)
        post({ id: message.id, ok: true, without: joinLines(linesWithoutKeywords) })
        return
      }
      case 'replace': {
        const keys = getKeywordsArray(message.keywords)
        const replacements = getReplacementArray(message.replacements)
        // Make default Replace case-insensitive
        const replaced = replaceValuesCaseInsensitive(inputLines, keys, replacements)
        post({ id: message.id, ok: true, with: joinLines(replaced) })
        return
      }
      case 'replaceUpper': {
        const keys = getKeywordsArray(message.keywords)
        const replacements = getReplacementArray(message.replacements)
        const replaced = replaceValuesUpperCase(inputLines, keys, replacements)
        post({ id: message.id, ok: true, with: joinLines(replaced) })
        return
      }
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Worker error'
    post({ id: event.data.id, ok: false, error })
  }
}

type Result = { id: string; ok: boolean; with?: string; without?: string; error?: string }

self.onmessage = (event: MessageEvent<Actions>) => {
  const message = event.data
  try {
    const inputLines = getUniqueLines(message.input)
    switch (message.type) {
      case 'splitTwo': {
        const keys = getKeywordsArray(message.keywords)
        const linesWithKeywords = filterWithAnyKeywordCaseInsensitive(inputLines, keys)
        const linesWithoutKeywords = filterWithoutAnyKeywordCaseInsensitive(inputLines, keys)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(linesWithKeywords), without: joinLines(linesWithoutKeywords) })
        return
      }
      case 'strictBegin': {
        const keys = getKeywordsArray(message.keywords)
        const { withKeywords, withoutKeywords } = splitAtBeginning(inputLines, keys)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(withKeywords), without: joinLines(withoutKeywords) })
        return
      }
      case 'strictInner': {
        const keys = getKeywordsArray(message.keywords)
        const { withKeywords, withoutKeywords } = splitByCellInnerValue(inputLines, keys)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(withKeywords), without: joinLines(withoutKeywords) })
        return
      }
      case 'strictEnd': {
        const keys = getKeywordsArray(message.keywords)
        const { withKeywords, withoutKeywords } = splitAtEnding(inputLines, keys)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(withKeywords), without: joinLines(withoutKeywords) })
        return
      }
      case 'createWith': {
        const keys = getKeywordsArray(message.keywords)
        const linesWithKeywords = filterWithAnyKeywordCaseInsensitive(inputLines, keys)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(linesWithKeywords) })
        return
      }
      case 'createWithout': {
        const keys = getKeywordsArray(message.keywords)
        const linesWithoutKeywords = filterWithoutAnyKeywordCaseInsensitive(inputLines, keys)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, without: joinLines(linesWithoutKeywords) })
        return
      }
      case 'replace': {
        const keys = getKeywordsArray(message.keywords)
        const replacements = getReplacementArray(message.replacements)
        const replaced = replaceValuesCaseInsensitive(inputLines, keys, replacements)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(replaced) })
        return
      }
      case 'replaceUpper': {
        const keys = getKeywordsArray(message.keywords)
        const replacements = getReplacementArray(message.replacements)
        const replaced = replaceValuesUpperCase(inputLines, keys, replacements)
        ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(replaced) })
        return
      }
      case 'dedup': {
        const allLines = message.input.replace(/\r/g, '').split('\n')
        const lineToCountMap = new Map<string, number>()
        for (const line of allLines) lineToCountMap.set(line, (lineToCountMap.get(line) || 0) + 1)
        const uniqueOnly: string[] = []
        const duplicatesOnly: string[] = []
        for (const [line, count] of lineToCountMap) {
          if (line === '') continue
          if (count > 1) duplicatesOnly.push(line)
          uniqueOnly.push(line)
        }
        (self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: message.id, ok: true, with: joinLines(uniqueOnly), without: joinLines(duplicatesOnly) })
        return
      }
    }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Worker error'
    ;(self as unknown as { postMessage: (r: Result) => void }).postMessage({ id: event.data.id, ok: false, error })
  }
}


