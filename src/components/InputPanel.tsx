import { useRef } from 'react'
import { readFileAsText } from '../utils/fileImport'
import { ClearIcon } from './Icons'
import { CopyWithToast } from './CopyWithToast'
import { VirtualizedViewer } from './VirtualizedViewer'

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

  const handleFileImport = async (file: File | null | undefined) => {
    if (!file) return
    try {
      const text = await readFileAsText(file)
      setIncomingBuffer(text)
      incomingBufferRef.current = text
      setIncomingHasValue(Boolean(text && text.length))
    } catch (err) {
      alert('Failed to import file')
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
        setIncomingBuffer(text)
        incomingBufferRef.current = text
        setIncomingHasValue(Boolean(text && text.length))
      }
    }
  }

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
          style={{ padding: 8 }}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData?.getData('text/plain') || ''
            setIncomingBuffer(text)
            incomingBufferRef.current = text
            setIncomingHasValue(Boolean(text && text.length))
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <VirtualizedViewer value={incomingBuffer} />
          {!incomingHasValue && <div className="placeholder">{t('eachLinePlaceholder')}</div>}
        </div>
      </div>
    </div>
  )
}
