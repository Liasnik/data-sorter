import { ClearIcon } from './Icons'

type KeywordsPanelProps = {
  keywordsInput: string;
  setKeywordsInput: (value: string) => void;
  replacementsInput: string;
  setReplacementsInput: (value: string) => void;
  onClearLists: () => void;
  onClearAll: () => void;
  onReplace: () => void;
  onReplaceUpper: () => void;
  t: (key: string) => string;
  disabled?: boolean;
}

export function KeywordsPanel({
  keywordsInput,
  setKeywordsInput,
  replacementsInput,
  setReplacementsInput,
  onClearLists,
  onClearAll,
  onReplace,
  onReplaceUpper,
  t,
  disabled = false,
}: KeywordsPanelProps) {
  return (
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setKeywordsInput('')
                  }
                }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setReplacementsInput('')
                  }
                }}
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
          <button id="del" className="btn" type="button" onClick={onClearLists}>{t('clearLists')}</button>
          <button id="del" className="btn" type="button" onClick={onClearAll}>{t('clearAllData')}</button>
        </div>
        <div className="replace-row-buttons">
          <button className="btn " type="button" onClick={onReplace} disabled={disabled}>{t('replace')}</button>
          <button className="btn" type="button" onClick={onReplaceUpper} disabled={disabled}>{t('replaceUppercase')}</button>
        </div>
      </div>
    </section>
  )
}
