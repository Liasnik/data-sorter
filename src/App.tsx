import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { FixedSizeList as List, ListChildComponentProps, type FixedSizeListProps } from 'react-window'
import './App.css'
import { copyTextToClipboard } from './utils/clipboard'
import { CopyIcon, ClearIcon } from './components/Icons'
import { TopControls } from './components/TopControls'
import { createTranslator, resolveDefaultLocale, Locale } from './i18n'
import { readFileAsText } from './utils/fileImport'

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
  const pendingRef = useRef<Map<string, (res: WorkerResult) => void>>(new Map())
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
    const w = new Worker(new URL('./workers/textWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    const localPending = pendingRef.current
    w.onmessage = (e: MessageEvent<WorkerResult>) => {
      const { id } = e.data || { id: '' }
      const cb = localPending.get(String(id))
      if (cb) {
        localPending.delete(String(id))
        cb(e.data)
      }
    }
    return () => { w.terminate(); workerRef.current = null; localPending.clear() }
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
    const res = await callWorker({ type: 'splitTwo', input, keywords: debouncedKeywords || keywordsInput })
    if (res?.ok) { setWithKeywords(res.with || ''); setWithoutKeywords(res.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleStrictBegin = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'strictBegin', input, keywords: debouncedKeywords || keywordsInput })
    if (res?.ok) { setWithKeywords(res.with || ''); setWithoutKeywords(res.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleStrictInner = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'strictInner', input, keywords: debouncedKeywords || keywordsInput })
    if (res?.ok) { setWithKeywords(res.with || ''); setWithoutKeywords(res.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleStrictEnd = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'strictEnd', input, keywords: debouncedKeywords || keywordsInput })
    if (res?.ok) { setWithKeywords(res.with || ''); setWithoutKeywords(res.without || ''); setLeftLabelMode('withKeywords'); setRightLabelMode('withoutKeywords') }
  }

  const handleCreateWithKeywords = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'createWith', input, keywords: debouncedKeywords || keywordsInput })
    if (res?.ok) { setWithKeywords(res.with || ''); setLeftLabelMode('withKeywords') }
  }

  const handleCreateWithoutKeywords = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'createWithout', input, keywords: debouncedKeywords || keywordsInput })
    if (res?.ok) { setWithoutKeywords(res.without || ''); setRightLabelMode('withoutKeywords') }
  }

  const handleReplace = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'replace', input, keywords: debouncedKeywords || keywordsInput, replacements: debouncedReplacements || replacementsInput })
    if (res?.ok) { setWithKeywords(res.with || ''); setLeftLabelMode('withKeywords') } else { alert(t('replacementError')) }
  }

  const handleReplaceUpper = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'replaceUpper', input, keywords: debouncedKeywords || keywordsInput, replacements: debouncedReplacements || replacementsInput })
    if (res?.ok) { setWithKeywords(res.with || ''); setLeftLabelMode('withKeywords') } else { alert(t('replacementError')) }
  }

  const handleDeduplicate = async () => {
    const input = incomingBufferRef.current || ''
    const res = await callWorker({ type: 'dedup', input })
    if (res?.ok) {
      setWithKeywords(res.with || '')
      setWithoutKeywords(res.without || '')
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

  function VirtualizedViewer({ value }: { value: string }) {
    const lines = useMemo(() => (value ? value.split('\n') : []), [value])
    const itemSize = 20
    const [height, setHeight] = useState(240)
    
       useEffect(() => {
        const updateHeight = () => {
          if (window.innerWidth >= 1700) setHeight(240)
          else if (window.innerWidth >= 1600) setHeight(230)
          else if (window.innerWidth >= 1400) setHeight(200)
          else if (window.innerWidth >= 1300) setHeight(150)
          else if (window.innerWidth >= 1200) setHeight(120)
          else if (window.innerWidth >= 980) setHeight(110)
          else setHeight(90)
        }
        
        updateHeight()
        window.addEventListener('resize', updateHeight)
        return () => window.removeEventListener('resize', updateHeight)
      }, [])
      

    const Row = ({ index, style }: ListChildComponentProps) => (
      <div style={{ ...style, width: 'auto', right: 'auto', whiteSpace: 'pre' }}>{lines[index]}</div>
    )
    const VList = List as unknown as ComponentType<FixedSizeListProps>
    return (
      <div className="virtual-list" style={{ width: '100%', height }}>
        <VList className="virtual-scroll" height={height} itemCount={lines.length} itemSize={itemSize} width={'100%'}>
          {Row}
        </VList>
      </div>
    )
  }

  // Reusable copy with toast (no querySelector, uses state)
  function CopyWithToast({ getText }: { getText: () => string }) {
    const [phase, setPhase] = useState<'idle' | 'show' | 'leave'>('idle')
    const timersRef = useRef<number[]>([])
    const clearTimers = () => { timersRef.current.forEach(id => window.clearTimeout(id)); timersRef.current = [] }
    const show = () => {
      clearTimers()
      setPhase('show')
      timersRef.current.push(window.setTimeout(() => setPhase('leave'), 400))
      timersRef.current.push(window.setTimeout(() => setPhase('idle'), 600))
    }
    const onCopy = async () => { await copyTextToClipboard(getText()); show() }
    const onKey = async (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); await onCopy() }
    }
    useEffect(() => () => clearTimers(), [])
    return (
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <span className="copy-icon" role="button" tabIndex={0} aria-label={t('copyTooltip')} title={t('copyTooltip')} onClick={onCopy} onKeyDown={onKey}>
          <CopyIcon />
        </span>
        <span className={`copied-toast${phase === 'show' ? ' show' : ''}${phase === 'leave' ? ' leave' : ''}`}>{t('copied')}</span>
      </span>
    )
  }

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
                  <CopyWithToast getText={() => incomingBufferRef.current || incomingBuffer || ''} />
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

        <div className="card gridItem-with">
          <div className="field-group">
            <div className="label-row line-count">
              <div className="field-actions">
              <label htmlFor="with-keywords" className="label">{leftLabel}</label>
                {withCount > 0 && (
                  <>
                   <span className="line-count">{withCount}</span>
                   <CopyWithToast getText={() => withKeywords} />
                  </>
                )}
              </div>
                {withKeywords && (
                  <span
                    className="clear-icon"
                    role="button"
                    tabIndex={0}
                    aria-label="Clear"
                    title="Clear"
                    onClick={() => setWithKeywords('')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWithKeywords('') } }}
                  >
                    <ClearIcon />
                  </span>
                )}
            </div>
            <VirtualizedViewer value={withKeywords} />
          </div>
          <div className="actions">
            <button className="btn" type="button" onClick={handleCreateWithKeywords}>{t('withKeywordsBtn')}</button>
          </div>
        </div>

        <div className="card gridItem-without">
          <div className="field-group">
            <div className="label-row line-count">
              <div className="field-actions">
              <label htmlFor="without-keywords" className="label">{rightLabel}</label>
                {withoutCount > 0 && (
                  <>
                   <span className="line-count">{withoutCount}</span>
                   <CopyWithToast getText={() => withoutKeywords} />
                  </>
                )}
              </div>
                {withoutKeywords && (
                  <span
                    className="clear-icon"
                    role="button"
                    tabIndex={0}
                    aria-label="Clear"
                    title="Clear"
                    onClick={() => setWithoutKeywords('')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWithoutKeywords('') } }}
                  >
                    <ClearIcon />
                  </span>
                )}
            </div>
            <VirtualizedViewer value={withoutKeywords} />
          </div>
          <div className="actions">
            <button className="btn" type="button" onClick={handleCreateWithoutKeywords}>{t('withoutKeywordsBtn')}</button>
          </div>
        </div>
      </section>
      </div>
  )
}

export default App
