import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { TopControls } from './components/TopControls'
import { createTranslator, resolveDefaultLocale, Locale } from './i18n'
import { OutputPanel } from './components/OutputPanel'
import { ActionsPanel } from './components/ActionsPanel'
import { InputPanel } from './components/InputPanel'
import { KeywordsPanel } from './components/KeywordsPanel'

function App() {
  const [keywordsInput, setKeywordsInput] = useState<string>('')
  const [replacementsInput, setReplacementsInput] = useState<string>('')
  // const incomingRef = useRef<HTMLTextAreaElement | null>(null)
  const [withKeywords, setWithKeywords] = useState<string>('')
  const [withoutKeywords, setWithoutKeywords] = useState<string>('')
  const [incomingBuffer, setIncomingBuffer] = useState<string>('')
  const [incomingHasValue, setIncomingHasValue] = useState<boolean>(false)
  const [debouncedKeywords, setDebouncedKeywords] = useState<string>('')
  const [debouncedReplacements, setDebouncedReplacements] = useState<string>('')
  const workerRef = useRef<Worker | null>(null)
  const incomingBufferRef = useRef<string>('')
  type WorkerResult = { id: string; ok: boolean; with?: string; without?: string; error?: string }
  type WorkerAction =
    | { type: 'splitTwo'; input: string; keywords: string }
    | { type: 'strictBegin' | 'strictInner' | 'strictEnd'; input: string; keywords: string }
    | { type: 'createWith' | 'createWithout'; input: string; keywords: string }
    | { type: 'replace' | 'replaceUpper'; input: string; keywords: string; replacements: string }
    | { type: 'dedup'; input: string }
  const pendingRef = useRef<Map<string, (result: WorkerResult) => void>>(new Map())
  const reqIdRef = useRef<number>(0)
  const [locale, setLocale] = useState<Locale>(resolveDefaultLocale())
  const t = useMemo(() => createTranslator(locale), [locale])
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })

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
    const anyWindow = window as unknown as { ipcRenderer?: { send: (ch: string, payload: unknown) => void } }
    anyWindow.ipcRenderer?.send('locale-updated', locale)
  }, [locale])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    const root = document.documentElement
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const effective = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
    root.setAttribute('data-theme', effective)
    const anyWindow = window as unknown as { ipcRenderer?: { send: (ch: string, payload: unknown) => void } }
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
      ipcRenderer?: { on: (ch: string, fn: (...args: unknown[]) => void) => void; off: (ch: string, fn: (...args: unknown[]) => void) => void }
    }
    anyWindow.ipcRenderer?.on('set-theme', onTheme)
    anyWindow.ipcRenderer?.on('set-locale', onLocale)
    // clear-all: handled by shared onClearAll()
    // buffer load / clear
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
  }, [])

  // Persist buffer periodically and on unload (best-effort)
  useEffect(() => {
    const anyWindow = window as unknown as { ipcRenderer?: { send: (ch: string, payload: unknown) => void } }
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

  // init worker
  useEffect(() => {
    const worker = new Worker(new URL('./workers/textWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    const localPending = pendingRef.current
    worker.onmessage = (messageEvent: MessageEvent<WorkerResult>) => {
      const { id } = messageEvent.data || { id: '' }
      const pendingPromiseResolver = localPending.get(String(id))
      if (pendingPromiseResolver) {
        localPending.delete(String(id))
        pendingPromiseResolver(messageEvent.data)
      }
    }
    return () => { worker.terminate(); workerRef.current = null; localPending.clear() }
  }, [])

  function callWorker(payload: WorkerAction): Promise<WorkerResult> {
    const id = String(++reqIdRef.current)
    return new Promise<WorkerResult>((resolve) => {
      pendingRef.current.set(id, resolve)
      workerRef.current?.postMessage({ id, ...payload })
    })
  }

  const handleSplitTwoAreas = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'splitTwo', input, keywords: debouncedKeywords || keywordsInput })
    if (result?.ok) { setWithKeywords(result.with || ''); setWithoutKeywords(result.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleStrictBegin = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'strictBegin', input, keywords: debouncedKeywords || keywordsInput })
    if (result?.ok) { setWithKeywords(result.with || ''); setWithoutKeywords(result.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleStrictInner = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'strictInner', input, keywords: debouncedKeywords || keywordsInput })
    if (result?.ok) { setWithKeywords(result.with || ''); setWithoutKeywords(result.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleStrictEnd = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'strictEnd', input, keywords: debouncedKeywords || keywordsInput })
    if (result?.ok) { setWithKeywords(result.with || ''); setWithoutKeywords(result.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleCreateWithKeywords = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'createWith', input, keywords: debouncedKeywords || keywordsInput })
    if (result?.ok) { setWithKeywords(result.with || ''); setLeftLabelMode('withKeywords') }
  }

  const handleCreateWithoutKeywords = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'createWithout', input, keywords: debouncedKeywords || keywordsInput })
    if (result?.ok) { setWithoutKeywords(result.without || ''); setRightLabelMode('withoutKeywords') }
  }

  const handleReplace = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'replace', input, keywords: debouncedKeywords || keywordsInput, replacements: debouncedReplacements || replacementsInput })
    if (result?.ok) { setWithKeywords(result.with || ''); setLeftLabelMode('withKeywords') } else { alert(t('replacementError')) }
  }

  const handleReplaceUpper = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'replaceUpper', input, keywords: debouncedKeywords || keywordsInput, replacements: debouncedReplacements || replacementsInput })
    if (result?.ok) { setWithKeywords(result.with || ''); setLeftLabelMode('withKeywords') } else { alert(t('replacementError')) }
  }

  const handleDeduplicate = async () => {
    const input = incomingBufferRef.current || ''
    const result = await callWorker({ type: 'dedup', input })
    if (result?.ok) {
      setWithKeywords(result.with || '')
      setWithoutKeywords(result.without || '')
      setLeftLabelMode('withoutDuplicates')
      setRightLabelMode('duplicates')
    }
  }

  const onClearAll = () => {
    localStorage.removeItem('key')
    setKeywordsInput('')
    setReplacementsInput('')
    setIncomingBuffer('')
    incomingBufferRef.current = ''
    setIncomingHasValue(false)
    setWithKeywords('')
    setWithoutKeywords('')
  }

  const handleClearLists = () => {
    setIncomingBuffer('')
    incomingBufferRef.current = ''
    setIncomingHasValue(false)
    setWithKeywords('')
    setWithoutKeywords('')
  }

  // Virtualized viewer for big outputs (keeps copy/clear actions on container)
  function countLines(text: string): number {
    if (!text) return 0
    let count = 1
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count++
    return count
  }

  const incomingCount = useMemo(() => countLines(incomingBuffer), [incomingBuffer])
  const withCount = useMemo(() => countLines(withKeywords), [withKeywords])
  const withoutCount = useMemo(() => countLines(withoutKeywords), [withoutKeywords])

  // Dynamic labels per panel (avoid misleading when only one panel updates)
  type LabelMode = 'withKeywords' | 'withoutKeywords' | 'withoutDuplicates' | 'duplicates'
  const [leftLabelMode, setLeftLabelMode] = useState<LabelMode>('withKeywords')
  const [rightLabelMode, setRightLabelMode] = useState<LabelMode>('withoutKeywords')

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
          t={t}
        />

        <OutputPanel
          className="gridItem-with"
          label={leftLabel}
          htmlFor="with-keywords"
          value={withKeywords}
          count={withCount}
          onClear={() => setWithKeywords('')}
          actionButtonText={t('withKeywordsBtn')}
          onActionButtonClick={handleCreateWithKeywords}
          t={t as (key: 'copyTooltip' | 'copied') => string}
        />

        <OutputPanel
          className="gridItem-without"
          label={rightLabel}
          htmlFor="without-keywords"
          value={withoutKeywords}
          count={withoutCount}
          onClear={() => setWithoutKeywords('')}
          actionButtonText={t('withoutKeywordsBtn')}
          onActionButtonClick={handleCreateWithoutKeywords}
          t={t as (key: 'copyTooltip' | 'copied') => string}
        />
      </section>
      </div>
  )
}

export default App
