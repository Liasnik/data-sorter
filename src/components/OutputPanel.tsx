import { ClearIcon, DownloadIcon } from './Icons'
import { CopyWithToast } from './CopyWithToast'
import { VirtualizedViewer } from './VirtualizedViewer'
import * as XLSX from 'xlsx'

type OutputPanelProps = {
  className: string;
  label: string;
  htmlFor: string;
  value: string;
  count: number;
  onClear: () => void;
  actionButtonText: string;
  onActionButtonClick: () => void;
  t: (key: 'copyTooltip' | 'copied') => string;
  loading?: boolean;
  disabled?: boolean;
}

export function OutputPanel({
  className,
  label,
  htmlFor,
  value,
  count,
  onClear,
  actionButtonText,
  onActionButtonClick,
  t,
  loading = false,
  disabled = false,
}: OutputPanelProps) {
  const handleExport = () => {
    if (!value) return
    const lines = value.split('\n').filter((line) => line)
    const data = lines.map((line) => line.split('\t'))
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    const fileName = `${label}.xlsx`.replace(/[^a-z0-9_.-]/gi, '_').replace(/_{2,}/g, '_')
    XLSX.writeFile(workbook, fileName)
  }

  const onKey = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleExport()
    }
  }
  return (
    <div className={`card ${className}`}>
      <div className="field-group">
        <div className="label-row line-count">
          <div className="field-actions">
            <label htmlFor={htmlFor} className="label">{label}</label>
            {count > 0 && (
              <>
                <span className="line-count">{count.toLocaleString()}</span>
                <CopyWithToast getText={() => value} t={t} />
                <span
                  className="copy-icon"
                  role="button"
                  tabIndex={0}
                  aria-label="Export to Excel"
                  title="Export to Excel"
                  onClick={handleExport}
                  onKeyDown={onKey}
                >
                  <DownloadIcon />
                </span>
              </>
            )}
          </div>
          {value && (
            <span
              className="clear-icon"
              role="button"
              tabIndex={0}
              aria-label="Clear"
              title="Clear"
              onClick={onClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClear()
                }
              }}
            >
              <ClearIcon />
            </span>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <VirtualizedViewer value={value} />
          {loading && (
            <div className="spinner-overlay" role="status" aria-live="polite">
              <div className="spinner" />
            </div>
          )}
        </div>
      </div>
      <div className="actions">
        <button className="btn" type="button" onClick={onActionButtonClick} disabled={disabled}>
          {actionButtonText}
        </button>
      </div>
    </div>
  )
}
