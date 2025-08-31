import { useRef, useState, useEffect } from 'react'
import { readFileAsText } from '../utils/fileImport'
import { ClearIcon } from './Icons'
import { CopyWithToast } from './CopyWithToast'
import { VirtualizedViewer } from './VirtualizedViewer'
import { WebContextMenu } from './WebContextMenu'

type InputPanelProps = {
  incomingBuffer: string;
  setIncomingBuffer: (value: string) => void;
  incomingBufferRef: React.MutableRefObject<string>;
  incomingHasValue: boolean;
  setIncomingHasValue: (value: boolean) => void;
  incomingCount: number;
  t: (key: string) => string;
}

export function InputPanel({
  incomingBuffer,
  setIncomingBuffer,
  incomingBufferRef,
  incomingHasValue,
  setIncomingHasValue,
  incomingCount,
  t,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const isElectron = typeof (window as unknown as { ipcRenderer?: unknown }).ipcRenderer !== 'undefined'
  const [loading, setLoading] = useState(false)

  const handleFileImport = async (file: File | null | undefined) => {
    if (!file) return
    try {
      setLoading(true)
      const text = await readFileAsText(file)
      setIncomingBuffer(text)
      incomingBufferRef.current = text
      setIncomingHasValue(Boolean(text && text.length))
    } catch (err) {
      alert('Failed to import file')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setIncomingBuffer('')
    incomingBufferRef.current = ''
    setIncomingHasValue(false)
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      await handleFileImport(file)
    } else {
      const text = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('text')
      if (text) {
        setLoading(true)
        try {
          setIncomingBuffer(text)
          incomingBufferRef.current = text
          setIncomingHasValue(Boolean(text && text.length))
        } finally {
          setLoading(false)
        }
      }
    }
  }

  useEffect(() => {
    if (!ctxOpen) return
    const close = () => setCtxOpen(false)
    window.addEventListener('click', close)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [ctxOpen])

  return (
    <div className="card gridItem-input">
      <div className="field-group">
        <div className="import-row" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <button className="btn" type="button" onClick={() => fileInputRef.current?.click()}>
            Import file (.xlsx, .xls, .csv, .txt)
          </button>
          <span className="hint">{t('importHint')}</span>
        </div>
        <div className="label-row line-count">
          <div className="field-actions">
            <label htmlFor="incoming-list" className="label">{t('pasteListHere')}</label>
            {incomingCount > 0 && (
              <>
                <span className="line-count">{incomingCount}</span>
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
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClear()
                }
              }}
            >
              <ClearIcon />
            </span>
          )}
        </div>
        <input
          id="file-input"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          style={{ display: 'none' }}
          onChange={async (e) => {
            await handleFileImport(e.target.files?.[0])
            e.currentTarget.value = ''
          }}
        />
        <div
          id="incoming-list"
          className="textarea"
          tabIndex={0}
          role="textbox"
          aria-multiline="true"
          aria-label={t('pasteListHere')}
          aria-busy={loading}
          style={{ padding: 8 }}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData?.getData('text/plain') || ''
            setLoading(true)
            try {
              setIncomingBuffer(text)
              incomingBufferRef.current = text
              setIncomingHasValue(Boolean(text && text.length))
            } finally {
              setLoading(false)
            }
          }}
          onContextMenu={(e) => {
            if (isElectron) return // дать Electron показать системное меню
            e.preventDefault()
            setCtxPos({ x: e.clientX, y: e.clientY })
            setCtxOpen(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <VirtualizedViewer value={incomingBuffer} />
          {!incomingHasValue && <div className="placeholder">{t('eachLinePlaceholder')}</div>}
          {loading && (
            <div className="spinner-overlay" role="status" aria-live="polite">
              <div className="spinner" />
            </div>
          )}
          {ctxOpen && !isElectron && (
            <WebContextMenu
              x={ctxPos.x}
              y={ctxPos.y}
              onClose={() => setCtxOpen(false)}
              onPaste={async () => {
                setLoading(true)
                try {
                  const text = await navigator.clipboard.readText()
                  if (typeof text === 'string') {
                    setIncomingBuffer(text)
                    incomingBufferRef.current = text
                    setIncomingHasValue(Boolean(text && text.length))
                  }
                } finally {
                  setLoading(false)
                }
              }}
              onCopy={async () => {
                await navigator.clipboard.writeText(incomingBufferRef.current || incomingBuffer || '')
              }}
              onClear={() => handleClear()}
              t={(k) => t(k)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
