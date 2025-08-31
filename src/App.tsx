import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import './App.css'
import { TopControls } from './components/TopControls'
import { createTranslator, resolveDefaultLocale, Locale } from './i18n'
import { OutputPanel } from './components/OutputPanel'
import { ActionsPanel } from './components/ActionsPanel'
import { InputPanel } from './components/InputPanel'
import { KeywordsPanel } from './components/KeywordsPanel'
import { countLines } from './utils/countLines'
import { useTextProcessing } from './hooks/useTextProcessing'

function App() {
  const [keywordsInput, setKeywordsInput] = useState<string>('')
  const [replacementsInput, setReplacementsInput] = useState<string>('')
  const [incomingBuffer, setIncomingBuffer] = useState<string>('')
  const [incomingHasValue, setIncomingHasValue] = useState<boolean>(false)
  const [debouncedKeywords, setDebouncedKeywords] = useState<string>('')
  const [debouncedReplacements, setDebouncedReplacements] = useState<string>('')
  
  const incomingBufferRef = useRef<string>('')
  const [locale, setLocale] = useState<Locale>(resolveDefaultLocale())
  const t = useMemo(() => createTranslator(locale), [locale])
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })

  const {
    withKeywords,
    withoutKeywords,
    leftLabelMode,
    rightLabelMode,
    loading,
    handleSplitTwoAreas,
    handleStrictBegin,
    handleStrictInner,
    handleStrictEnd,
    handleCreateWithKeywords,
    handleCreateWithoutKeywords,
    handleReplace,
    handleReplaceUpper,
    handleDeduplicate,
    clearResults,
    clearWithKeywords,
    clearWithoutKeywords,
  } = useTextProcessing({
    getInput: () => incomingBufferRef.current || '',
    getKeywords: () => debouncedKeywords || keywordsInput,
    getReplacements: () => debouncedReplacements || replacementsInput,
    t,
  })

  const onClearAll = useCallback(() => {
    localStorage.removeItem('key')
    setKeywordsInput('')
    setReplacementsInput('')
    setIncomingBuffer('')
    incomingBufferRef.current = ''
    setIncomingHasValue(false)
    clearResults()
  }, [clearResults])

  const handleClearLists = useCallback(() => {
    setIncomingBuffer('')
    incomingBufferRef.current = ''
    setIncomingHasValue(false)
    clearResults()
  }, [clearResults])

  useEffect(() => {
    const savedKeywords = localStorage.getItem('key')
    if (savedKeywords) {
      try {
        const parsed = JSON.parse(savedKeywords)
        if (typeof parsed === 'string') setKeywordsInput(parsed)
      } catch {
        setKeywordsInput(savedKeywords)
      }
    }
  }, [])

  // Debounce keywords and replacements, then persist debounced keywords
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKeywords(keywordsInput.trim()), 300)
    return () => window.clearTimeout(id)
  }, [keywordsInput])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedReplacements(replacementsInput.trim()), 300)
    return () => window.clearTimeout(id)
  }, [replacementsInput])

  useEffect(() => {
    localStorage.setItem('key', JSON.stringify(debouncedKeywords))
  }, [debouncedKeywords])

  useEffect(() => {
    localStorage.setItem('locale', locale)
    const anyWindow = window as unknown as { ipcRenderer?: { send: (channel: string, payload: unknown) => void } }
    anyWindow.ipcRenderer?.send('locale-updated', locale)
  }, [locale])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    const root = document.documentElement
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const effective = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
    root.setAttribute('data-theme', effective)
    const anyWindow = window as unknown as { ipcRenderer?: { send: (channel: string, payload: unknown) => void } }
    anyWindow.ipcRenderer?.send('theme-updated', theme)
  }, [theme])

  useEffect(() => {
    const onTheme = (_: unknown, next: unknown) => {
      if (next === 'system' || next === 'light' || next === 'dark') setTheme(next)
    }
    const onLocale = (_: unknown, next: unknown) => {
      if (next === 'en' || next === 'ru' || next === 'uk') setLocale(next)
    }
    const anyWindow = window as unknown as {
      ipcRenderer?: { on: (channel: string, listener: (...args: unknown[]) => void) => void; off: (channel: string, listener: (...args: unknown[]) => void) => void }
    }
    anyWindow.ipcRenderer?.on('set-theme', onTheme)
    anyWindow.ipcRenderer?.on('set-locale', onLocale)
    
    const onLoad = (...args: unknown[]) => {
      const data = args[1]
      if (typeof data === 'string') {
        setIncomingBuffer(data)
        incomingBufferRef.current = data
        setIncomingHasValue(Boolean(data && data.length))
      }
    }
    const onClear = () => {
      setIncomingBuffer('')
      incomingBufferRef.current = ''
      setIncomingHasValue(false)
    }
    anyWindow.ipcRenderer?.on('load-buffer', onLoad)
    anyWindow.ipcRenderer?.on('clear-input', onClear)
    anyWindow.ipcRenderer?.on('clear-all', onClearAll)
    
    return () => {
      anyWindow.ipcRenderer?.off('set-theme', onTheme)
      anyWindow.ipcRenderer?.off('set-locale', onLocale)
      anyWindow.ipcRenderer?.off('load-buffer', onLoad)
      anyWindow.ipcRenderer?.off('clear-input', onClear)
      anyWindow.ipcRenderer?.off('clear-all', onClearAll)
    }
  }, [onClearAll])

  // Persist buffer periodically and on unload (best-effort)
  useEffect(() => {
    const anyWindow = window as unknown as { ipcRenderer?: { send: (channel: string, payload: unknown) => void } }
    const handler = () => anyWindow.ipcRenderer?.send('save-buffer', incomingBufferRef.current || '')
    const id = window.setInterval(handler, 3000)
    window.addEventListener('beforeunload', handler)
    return () => { window.clearInterval(id); window.removeEventListener('beforeunload', handler) }
  }, [])

  // Keep ref in sync with state for persistence/worker
  useEffect(() => {
    incomingBufferRef.current = incomingBuffer
  }, [incomingBuffer])

  // Prevent default browser navigation for drag&drop globally
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  const incomingCount = useMemo(() => countLines(incomingBuffer), [incomingBuffer])
  const withCount = useMemo(() => countLines(withKeywords), [withKeywords])
  const withoutCount = useMemo(() => countLines(withoutKeywords), [withoutKeywords])
  const isInputEmpty = useMemo(() => !incomingBuffer || incomingBuffer.length === 0, [incomingBuffer])

  const leftLabel = useMemo(() => {
    switch (leftLabelMode) {
      case 'withKeywords': return t('dataWithKeywords')
      case 'withoutKeywords': return t('dataWithoutKeywords')
      case 'withoutDuplicates': return t('dataWithoutDuplicates')
      case 'duplicates': return t('duplicates')
    }
  }, [leftLabelMode, t])
  
  const rightLabel = useMemo(() => {
    switch (rightLabelMode) {
      case 'withKeywords': return t('dataWithKeywords')
      case 'withoutKeywords': return t('dataWithoutKeywords')
      case 'withoutDuplicates': return t('dataWithoutDuplicates')
      case 'duplicates': return t('duplicates')
    }
  }, [rightLabelMode, t])

  return (
    <div className="container">
      <TopControls locale={locale} onSelectLocale={setLocale} theme={theme} onSelectTheme={setTheme} />    
      <KeywordsPanel
        keywordsInput={keywordsInput}
        setKeywordsInput={setKeywordsInput}
        replacementsInput={replacementsInput}
        setReplacementsInput={setReplacementsInput}
        onClearLists={handleClearLists}
        onClearAll={onClearAll}
        onReplace={handleReplace}
        onReplaceUpper={handleReplaceUpper}
        disabled={isInputEmpty}
        t={t}
      />
      <section className="grid">
        <InputPanel
          incomingBuffer={incomingBuffer}
          setIncomingBuffer={setIncomingBuffer}
          incomingBufferRef={incomingBufferRef}
          incomingHasValue={incomingHasValue}
          setIncomingHasValue={setIncomingHasValue}
          incomingCount={incomingCount}
          t={t}
        />
        <ActionsPanel
          onSplitTwoAreas={handleSplitTwoAreas}
          onStrictBegin={handleStrictBegin}
          onStrictInner={handleStrictInner}
          onStrictEnd={handleStrictEnd}
          onDeduplicate={handleDeduplicate}
          disabled={isInputEmpty}
          t={t}
        />
        <OutputPanel
          className="gridItem-with"
          label={leftLabel}
          htmlFor="with-keywords"
          value={withKeywords}
          loading={loading}
          count={withCount}
          onClear={clearWithKeywords}
          actionButtonText={t('withKeywordsBtn')}
          onActionButtonClick={handleCreateWithKeywords}
          disabled={isInputEmpty}
          t={t as (key: 'copyTooltip' | 'copied') => string}
        />
        <OutputPanel
          className="gridItem-without"
          label={rightLabel}
          htmlFor="without-keywords"
          value={withoutKeywords}
          loading={loading}
          count={withoutCount}
          onClear={clearWithoutKeywords}
          actionButtonText={t('withoutKeywordsBtn')}
          onActionButtonClick={handleCreateWithoutKeywords}
          disabled={isInputEmpty}
          t={t as (key: 'copyTooltip' | 'copied') => string}
        />
      </section>
    </div>
  )
}

export default App