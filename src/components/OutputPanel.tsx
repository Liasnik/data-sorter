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
        <VirtualizedViewer value={value} />
      </div>
      <div className="actions">
        <button className="btn" type="button" onClick={onActionButtonClick}>
          {actionButtonText}
        </button>
      </div>
    </div>
  )
}
