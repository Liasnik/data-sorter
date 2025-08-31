import { ClearIcon } from './Icons'
import { CopyWithToast } from './CopyWithToast'
import { VirtualizedViewer } from './VirtualizedViewer'

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
  return (
    <div className={`card ${className}`}>
      <div className="field-group">
        <div className="label-row line-count">
          <div className="field-actions">
            <label htmlFor={htmlFor} className="label">{label}</label>
            {count > 0 && (
              <>
                <span className="line-count">{count}</span>
                <CopyWithToast getText={() => value} t={t} />
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
