import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { ClearIcon } from './components/Icons'
import { TopControls } from './components/TopControls'
import { createTranslator, resolveDefaultLocale, Locale } from './i18n'
import { readFileAsText } from './utils/fileImport'
import { VirtualizedViewer } from './components/VirtualizedViewer'
import { OutputPanel } from './components/OutputPanel'
import { CopyWithToast } from './components/CopyWithToast'

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

  // Reusable copy with toast (no querySelector, uses state)
  // MOVED to components/CopyWithToast.tsx

  // moved top controls into components/TopControls

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
      <section className="panel">
        <div className="field-group">
          <div className="label-row">
            <label htmlFor="input-keywords" className="label">{t('enterKeywordsLabel')}</label>
          </div>
          <div className="input-row">
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                id="input-keywords"
                className="input"
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder={t('keywordsPlaceholder')}
              />
              {keywordsInput && (
                <span
                  className="clear-icon"
                  title="Clear"
                  role="button"
                  tabIndex={0}
                  onClick={() => setKeywordsInput('')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setKeywordsInput('') } }}
                  style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <ClearIcon />
                </span>
              )}
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <input
                id="input-replace"
                className="input flex-1"
                type="text"
                value={replacementsInput}
                onChange={(e) => setReplacementsInput(e.target.value)}
                placeholder={t('replacementsPlaceholder')}
              />
              {replacementsInput && (
                <span
                  className="clear-icon"
                  title="Clear"
                  role="button"
                  tabIndex={0}
                  onClick={() => setReplacementsInput('')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setReplacementsInput('') } }}
                  style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <ClearIcon />
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="replace-row">
        <div className="clear-buttons">
          <button id="del" className="btn" type="button" onClick={handleClearLists}>{t('clearLists')}</button>
          <button id="del" className="btn" type="button" onClick={onClearAll}>{t('clearAllData')}</button>
        </div>
          <div className="replace-row-buttons">
          <button className="btn " type="button" onClick={handleReplace}>{t('replace')}</button>
          <button className="btn" type="button" onClick={handleReplaceUpper}>{t('replaceUppercase')}</button>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="card gridItem-input">
          <div className="field-group">
          <div className="import-row" onDragOver={(e) => { e.preventDefault(); }} onDrop={async (e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) {
                try {
                  const text = await readFileAsText(file)
                  setIncomingBuffer(text)
                  incomingBufferRef.current = text
                  setIncomingHasValue(Boolean(text && text.length))
                } catch {
                  alert('Failed to import file')
                }
              } else {
                const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text')
                if (text) {
                  setIncomingBuffer(text)
                  incomingBufferRef.current = text
                  setIncomingHasValue(Boolean(text && text.length))
                }
              }
            }}>
              <button className="btn" type="button" onClick={() => document.getElementById('file-input')?.click()}>Import file (.xlsx, .xls, .csv, .txt)</button>
              <span className="hint">{t('importHint')}</span>
            </div>
            <div className="label-row line-count">
              <div className="field-actions">
                <label htmlFor="incoming-list" className="label">{t('pasteListHere')}</label>
                {incomingCount > 0 && (
                  <>
                  <span className="line-count" >{incomingCount}</span>
                  <CopyWithToast getText={() => incomingBufferRef.current || incomingBuffer || ''} t={t} />
                  </>
                )}
              </div>
                {incomingHasValue && (
                  <span
                    className="clear-icon"
                    role="button"
                    tabIndex={0}
                    aria-label="Clear"
                    title="Clear"
                    onClick={() => { setIncomingBuffer(''); incomingBufferRef.current = ''; setIncomingHasValue(false) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIncomingBuffer(''); incomingBufferRef.current = ''; setIncomingHasValue(false) } }}
                  >
                    <ClearIcon />
                  </span>
                )}
            </div>
            <input id="file-input" type="file" accept=".xlsx,.xls,.csv,.txt" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const text = await readFileAsText(file)
                setIncomingBuffer(text)
                incomingBufferRef.current = text
                setIncomingHasValue(Boolean(text && text.length))
              } catch (err) {
                alert('Failed to import file')
              } finally {
                e.currentTarget.value = ''
              }
            }} />

            <div
              id="incoming-list"
              className="textarea"
              style={{ padding: 8 }}
              onPaste={(e) => {
                e.preventDefault()
                const text = e.clipboardData?.getData('text/plain') || ''
                setIncomingBuffer(text)
                incomingBufferRef.current = text
                setIncomingHasValue(Boolean(text && text.length))
              }}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={async (e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) {
                  try {
                    const text = await readFileAsText(file)
                    setIncomingBuffer(text)
                    incomingBufferRef.current = text
                    setIncomingHasValue(Boolean(text && text.length))
                  } catch {
                    alert('Failed to import file')
                  }
                } else {
                  const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text')
                  if (text) {
                    setIncomingBuffer(text)
                    incomingBufferRef.current = text
                    setIncomingHasValue(Boolean(text && text.length))
                  }
                }
              }}
            >
              <VirtualizedViewer value={incomingBuffer} />
              {!incomingHasValue && <div className="placeholder">{t('eachLinePlaceholder')}</div>}
            </div>
          </div>
      </div>

        <div className="card gridItem-actions">
          <div className="actions">
            <button className="btn btn-accent" type="button" onClick={handleSplitTwoAreas}>
              {t('splitByAnyMatches')}
        </button>
            <div className="strict-row">
              <button className="btn" type="button" onClick={handleStrictBegin}>{t('exactBegin')}</button>
              <button className="btn" type="button" onClick={handleStrictInner}>{t('exactInner')}</button>
              <button className="btn" type="button" onClick={handleStrictEnd}>{t('exactEnd')}</button>
            </div>
            <div className="strict-row">
              <button className="btn" type="button" onClick={async () => { await handleDeduplicate() }}>{t('deduplicate')}</button>
            </div>
          </div>
        </div>

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
